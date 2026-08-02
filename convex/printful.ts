import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const PRINTFUL_API_URL = "https://api.printful.com";

/** Carries the HTTP status so callers can tell retryable failures from fatal ones. */
class PrintfulError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PrintfulError";
  }
}

async function printfulRequest(
  path: string,
  token: string,
  init?: { method?: string; body?: string }
) {
  const response = await fetch(`${PRINTFUL_API_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(init?.body ? { body: init.body } : {}),
  });

  if (!response.ok) {
    // Printful puts the useful detail in the body; the status text alone makes
    // fulfillment failures undebuggable.
    const body = await response.text().catch(() => "");
    throw new PrintfulError(
      `Printful API error: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
      response.status
    );
  }

  return response.json();
}

async function printfulFetch(path: string, token: string) {
  return printfulRequest(path, token);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Sync the Printful store into the `products` table.
 *
 * Internal: callable only from `admin.syncPrintfulProducts`, which enforces
 * requireAdmin. Leaving this public would let anyone hammer the Printful API.
 */
export const syncProducts = internalAction({
  args: {},
  handler: async (ctx): Promise<{ synced: number; deactivated: number }> => {
    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) {
      throw new Error(
        "PRINTFUL_API_TOKEN environment variable is not set. Add it in the Convex dashboard."
      );
    }

    // Catalog products are shared across sync products; fetch each at most once.
    const catalogCache = new Map<number, any | null>();
    async function getCatalogProduct(productId: number): Promise<any | null> {
      if (catalogCache.has(productId)) {
        return catalogCache.get(productId) ?? null;
      }
      let product: any | null = null;
      try {
        const response = await printfulFetch(`/products/${productId}`, token!);
        product = response.result?.product ?? null;
      } catch {
        // A catalog miss should degrade the mapping, not fail the whole sync.
        product = null;
      }
      catalogCache.set(productId, product);
      return product;
    }

    const listResponse = await printfulFetch("/sync/products?limit=100", token);
    const syncProductList: any[] = listResponse.result ?? [];

    let synced = 0;
    const seenPrintfulIds: number[] = [];

    for (const syncProduct of syncProductList) {
      const detailResponse = await printfulFetch(
        `/sync/products/${syncProduct.id}`,
        token
      );

      const { sync_product, sync_variants } = detailResponse.result;
      const syncVariants: any[] = sync_variants ?? [];

      const variants = syncVariants.map((sv: any) => ({
        id: sv.id,
        name: sv.name,
        size: sv.size || sv.product?.variant?.size || sv.sku || "One Size",
        color: sv.color || sv.product?.variant?.color || "Default",
        price: parseFloat(sv.retail_price) || 0,
        available:
          !sv.is_ignored &&
          sv.availability_status !== "discontinued" &&
          sv.availability_status !== "out_of_stock",
      }));

      const images: string[] = [];
      const addImage = (url?: string | null) => {
        if (url && !images.includes(url)) {
          images.push(url);
        }
      };

      addImage(sync_product.thumbnail_url);
      for (const sv of syncVariants) {
        for (const file of sv.files ?? []) {
          if (file.type === "preview") {
            addImage(file.preview_url);
          }
        }
      }

      // Real descriptions and product types live on the catalog product, not
      // the sync product.
      const catalogProductId = syncVariants.find(
        (sv: any) => sv.product?.product_id
      )?.product?.product_id;
      const catalogProduct = catalogProductId
        ? await getCatalogProduct(catalogProductId)
        : null;

      // Garment copy only. The hand-written `description` is never touched by
      // the sync — it is not even accepted as an upsertProduct argument.
      const garmentDescription: string =
        typeof catalogProduct?.description === "string" &&
        catalogProduct.description.trim().length > 0
          ? catalogProduct.description.trim()
          : "";

      // `type` is the garment category ("T-SHIRT"); `type_name` is the specific
      // model ("Bella + Canvas 3001 | Unisex Jersey Short Sleeve Tee"), which
      // is useless as a storefront category — every shirt would share one.
      const typeSlug = catalogProduct?.type ? slugify(catalogProduct.type) : "";
      const categories = typeSlug ? [typeSlug] : ["t-shirt"];

      // Printful carries no field that maps to this brand's tags, which are
      // themes ("food", "humor"). The only per-product vocabulary it offers is
      // garment color, which is actively wrong here — the shirt named "RED"
      // prints on a yellow tee and would be tagged "yellow". So tags are left
      // for hand-curation in /admin/products, which upsertProduct preserves.
      const tags: string[] = [];

      const pricedVariants = variants.filter((variant) => variant.price > 0);
      const basePrice =
        pricedVariants.length > 0
          ? Math.min(...pricedVariants.map((variant) => variant.price))
          : 0;

      await ctx.runMutation(internal.printful.upsertProduct, {
        printfulId: sync_product.id,
        slug: slugify(sync_product.name),
        name: sync_product.name,
        garmentDescription,
        price: basePrice,
        images: images.length > 0 ? images : ["/placeholder.png"],
        categories,
        tags,
        variants,
      });

      seenPrintfulIds.push(sync_product.id);
      synced++;
    }

    const { deactivated }: { deactivated: number } = await ctx.runMutation(
      internal.printful.deactivateMissingProducts,
      { seenPrintfulIds }
    );

    return { synced, deactivated };
  },
});

export const upsertProduct = internalMutation({
  args: {
    printfulId: v.number(),
    slug: v.string(),
    name: v.string(),
    // `description` is deliberately absent: the hand-written copy must be
    // unreachable from the sync, so a re-sync provably cannot clobber it.
    garmentDescription: v.string(),
    price: v.number(),
    images: v.array(v.string()),
    categories: v.array(v.string()),
    tags: v.array(v.string()),
    variants: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        size: v.string(),
        color: v.string(),
        price: v.number(),
        available: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_printful_id", (q) => q.eq("printfulId", args.printfulId))
      .unique();

    if (existing) {
      // `slug` is deliberately dropped: an existing product's URL must not
      // change because someone renamed the shirt in Printful.
      const { printfulId, slug, ...updates } = args;
      await ctx.db.patch(existing._id, {
        ...updates,
        featured: existing.featured,
        categories:
          existing.categories.length > 0 ? existing.categories : updates.categories,
        tags:
          existing.tags && existing.tags.length > 0 ? existing.tags : updates.tags,
        active: true,
      });
      return;
    }

    // New product: resolve slug collisions so `by_slug` stays unique and
    // products.getBySlug cannot break.
    const baseSlug = args.slug || slugify(args.name) || `product-${args.printfulId}`;
    let slug = baseSlug;
    let suffix = 2;
    while (
      await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first()
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    await ctx.db.insert("products", {
      ...args,
      slug,
      featured: false,
      active: true,
    });
  },
});

/**
 * Deactivate products that are no longer in the Printful store.
 *
 * Products with no `printfulId` were created by hand in /admin/products and
 * are left alone. Deactivates rather than deletes so existing orders keep
 * resolving their line items.
 */
export const deactivateMissingProducts = internalMutation({
  args: { seenPrintfulIds: v.array(v.number()) },
  handler: async (ctx, args) => {
    const seen = new Set(args.seenPrintfulIds);
    const products = await ctx.db.query("products").collect();

    let deactivated = 0;
    for (const product of products) {
      if (product.printfulId === undefined) continue;
      if (seen.has(product.printfulId)) continue;
      if (!product.active) continue;

      await ctx.db.patch(product._id, { active: false });
      deactivated++;
    }

    return { deactivated };
  },
});

// ---- Order fulfillment ----

const MAX_FULFILLMENT_ATTEMPTS = 3;

export const getOrderForFulfillment = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

export const recordFulfillmentSuccess = internalMutation({
  args: { orderId: v.id("orders"), printfulOrderId: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      printfulOrderId: args.printfulOrderId,
      status: "submitted",
      fulfillmentError: undefined,
    });
  },
});

export const recordFulfillmentFailure = internalMutation({
  args: {
    orderId: v.id("orders"),
    error: v.string(),
    final: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      fulfillmentError: args.error,
      // Only a final failure changes status; a retrying order stays as-is so
      // it is not shown as failed while attempts remain.
      ...(args.final ? { status: "fulfillment_failed" } : {}),
    });
  },
});

/**
 * Submit a paid order to Printful.
 *
 * Scheduled from stripe.applyPaymentStatus once payment is confirmed, so the
 * webhook can return 200 immediately. Idempotent: an order that already has a
 * printfulOrderId returns early, because Stripe retries webhooks and a double
 * submission means two shirts shipped for one payment.
 *
 * Creates a DRAFT order unless PRINTFUL_CONFIRM_ORDERS is "true". Flip that
 * env var once a real order has been verified end to end.
 */
export const submitOrder = internalAction({
  args: { orderId: v.id("orders"), attempt: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const attempt = args.attempt ?? 0;

    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) {
      await ctx.runMutation(internal.printful.recordFulfillmentFailure, {
        orderId: args.orderId,
        error: "PRINTFUL_API_TOKEN is not set in the Convex dashboard.",
        final: true,
      });
      return;
    }

    const order = await ctx.runQuery(internal.printful.getOrderForFulfillment, {
      orderId: args.orderId,
    });
    if (!order) return;
    if (order.printfulOrderId !== undefined) return;

    const confirm = process.env.PRINTFUL_CONFIRM_ORDERS === "true";

    const payload = {
      // Lets a Printful webhook resolve back to this order even if the
      // response is lost before printfulOrderId is stored.
      external_id: args.orderId,
      recipient: {
        name: order.shippingAddress.name,
        address1: order.shippingAddress.address1,
        ...(order.shippingAddress.address2
          ? { address2: order.shippingAddress.address2 }
          : {}),
        city: order.shippingAddress.city,
        state_code: order.shippingAddress.state,
        country_code: order.shippingAddress.country,
        zip: order.shippingAddress.zip,
        email: order.email,
      },
      // variantId is the Printful sync variant id written by syncProducts.
      items: order.items.map((item) => ({
        sync_variant_id: item.variantId,
        quantity: item.quantity,
      })),
    };

    try {
      const response = await printfulRequest(
        `/orders?confirm=${confirm ? 1 : 0}`,
        token,
        { method: "POST", body: JSON.stringify(payload) }
      );

      const printfulOrderId = response?.result?.id;
      if (typeof printfulOrderId !== "number") {
        throw new Error("Printful accepted the order but returned no order id.");
      }

      await ctx.runMutation(internal.printful.recordFulfillmentSuccess, {
        orderId: args.orderId,
        printfulOrderId,
      });
    } catch (error) {
      const status = error instanceof PrintfulError ? error.status : 0;
      const message = error instanceof Error ? error.message : String(error);

      // 4xx means the request is malformed or the variant is gone — retrying
      // will never succeed. Network errors, 429 and 5xx are worth another go.
      const retryable = status === 0 || status === 429 || status >= 500;
      const attemptsLeft = attempt + 1 < MAX_FULFILLMENT_ATTEMPTS;

      await ctx.runMutation(internal.printful.recordFulfillmentFailure, {
        orderId: args.orderId,
        error: message.slice(0, 500),
        final: !(retryable && attemptsLeft),
      });

      if (retryable && attemptsLeft) {
        await ctx.scheduler.runAfter(
          (attempt + 1) * 60_000,
          internal.printful.submitOrder,
          { orderId: args.orderId, attempt: attempt + 1 }
        );
      }
    }
  },
});

// ---- Fulfillment status from Printful ----

/**
 * Map a Printful order status onto this app's order vocabulary.
 *
 * Returns null for states that should not move the order, so an unknown
 * Printful status never writes a string the badge cannot render.
 */
export function mapPrintfulStatus(printfulStatus: string): string | null {
  switch (printfulStatus) {
    case "draft":
    case "pending":
    case "inprocess":
    case "onhold":
    case "partial":
      return "submitted";
    case "fulfilled":
      return "shipped";
    case "failed":
      return "fulfillment_failed";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

export const applyPrintfulUpdate = internalMutation({
  args: {
    printfulOrderId: v.optional(v.number()),
    externalId: v.optional(v.string()),
    status: v.optional(v.string()),
    shipment: v.optional(
      v.object({
        carrier: v.optional(v.string()),
        trackingNumber: v.optional(v.string()),
        trackingUrl: v.optional(v.string()),
        shippedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ matched: boolean }> => {
    let order = null;

    if (args.printfulOrderId !== undefined) {
      order = await ctx.db
        .query("orders")
        .withIndex("by_printful_order_id", (q) =>
          q.eq("printfulOrderId", args.printfulOrderId)
        )
        .unique();
    }

    // external_id is the Convex order id we sent at submission time; it rescues
    // orders whose printfulOrderId never got stored.
    if (!order && args.externalId) {
      const orderId = ctx.db.normalizeId("orders", args.externalId);
      if (orderId) {
        order = await ctx.db.get(orderId);
      }
    }

    if (!order) {
      return { matched: false };
    }

    await ctx.db.patch(order._id, {
      ...(args.status ? { status: args.status } : {}),
      ...(args.shipment ? { shipment: args.shipment } : {}),
      ...(args.printfulOrderId !== undefined &&
      order.printfulOrderId === undefined
        ? { printfulOrderId: args.printfulOrderId }
        : {}),
    });

    return { matched: true };
  },
});
