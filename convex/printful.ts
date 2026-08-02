import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const PRINTFUL_API_URL = "https://api.printful.com";

async function printfulFetch(path: string, token: string) {
  const response = await fetch(`${PRINTFUL_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Shipping fallback, used when Printful can't be reached or has no token.
 *
 * PLACEHOLDER — this is a guess, not a real rate. It exists so checkout never
 * hard-fails on a shipping quote. Every order that falls back to it is an
 * order where we may be under- or over-charging for shipping, so treat a
 * persistent fallback as a bug, not a steady state. Replace by confirming the
 * live Printful rates path below works against a real token.
 */
export const FALLBACK_FLAT_SHIPPING_RATE_USD = 4.99;

export interface ShippingRecipient {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ShippingQuote {
  /** Shipping cost in dollars. */
  amount: number;
  /** Where the number came from — "printful" is a real rate, "fallback" is the constant. */
  source: "printful" | "fallback";
  /** Carrier/service name when we have a real rate. */
  serviceName?: string;
  /** Why we fell back, when we did. Surfaced for debugging, not to customers. */
  fallbackReason?: string;
}

/**
 * Ask Printful what shipping actually costs for this recipient and these items.
 *
 * Falls back to FALLBACK_FLAT_SHIPPING_RATE_USD on any failure rather than
 * throwing, so a Printful outage degrades the quote instead of blocking
 * checkout entirely.
 *
 * NOTE: `sync_variant_id` is the right field for variants that came from
 * `syncProducts` (our `variants[].id` values are Printful sync variant ids,
 * not catalog variant ids). This has not been exercised against a live token —
 * if quotes are always coming back as "fallback", check `fallbackReason`
 * first, since a rejected item shape is the most likely cause.
 */
export async function quoteShippingRate(
  recipient: ShippingRecipient,
  items: Array<{ variantId: number; quantity: number }>,
): Promise<ShippingQuote> {
  const token = process.env.PRINTFUL_API_TOKEN;

  if (!token) {
    return {
      amount: FALLBACK_FLAT_SHIPPING_RATE_USD,
      source: "fallback",
      fallbackReason: "PRINTFUL_API_TOKEN is not set",
    };
  }

  if (items.length === 0) {
    return { amount: 0, source: "fallback", fallbackReason: "No items" };
  }

  try {
    const response = await fetch(`${PRINTFUL_API_URL}/shipping/rates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: {
          address1: recipient.address1,
          address2: recipient.address2 || undefined,
          city: recipient.city,
          state_code: recipient.state,
          country_code: recipient.country,
          zip: recipient.zip,
        },
        items: items.map((item) => ({
          sync_variant_id: item.variantId,
          quantity: item.quantity,
        })),
        currency: "USD",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        amount: FALLBACK_FLAT_SHIPPING_RATE_USD,
        source: "fallback",
        fallbackReason: `Printful ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    const payload: { result?: Array<{ id: string; name: string; rate: string }> } =
      await response.json();

    const rates = (payload.result ?? [])
      .map((rate) => ({ name: rate.name, amount: parseFloat(rate.rate) }))
      .filter((rate) => Number.isFinite(rate.amount));

    if (rates.length === 0) {
      return {
        amount: FALLBACK_FLAT_SHIPPING_RATE_USD,
        source: "fallback",
        fallbackReason: "Printful returned no usable rates",
      };
    }

    // Cheapest option. Offering the customer a choice of speeds would mean
    // persisting which one they picked, which is a bigger change than this.
    const cheapest = rates.reduce((a, b) => (b.amount < a.amount ? b : a));

    return {
      amount: cheapest.amount,
      source: "printful",
      serviceName: cheapest.name,
    };
  } catch (error) {
    return {
      amount: FALLBACK_FLAT_SHIPPING_RATE_USD,
      source: "fallback",
      fallbackReason: `Shipping request failed: ${String(error).slice(0, 200)}`,
    };
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Shipping estimate for the checkout page, so the customer sees a breakdown
 * before they commit.
 *
 * This is DISPLAY ONLY. The amount actually charged is quoted again inside
 * `stripe.createCheckoutSession` from the persisted order, so a tampered
 * request here changes what one shopper sees and nothing about what they pay.
 */
export const quoteShipping = action({
  args: {
    recipient: v.object({
      address1: v.string(),
      address2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      country: v.string(),
    }),
    items: v.array(
      v.object({
        variantId: v.number(),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (_ctx, args): Promise<ShippingQuote> => {
    return await quoteShippingRate(args.recipient, args.items);
  },
});

export const syncProducts = action({
  args: {},
  handler: async (ctx) => {
    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) {
      throw new Error("PRINTFUL_API_TOKEN environment variable is not set. Add it in the Convex dashboard.");
    }

    // Fetch all sync products from Printful store
    const listResponse = await printfulFetch("/sync/products?limit=100", token);
    const syncProducts = listResponse.result;

    let synced = 0;

    for (const syncProduct of syncProducts) {
      // Fetch full product details including variants
      const detailResponse = await printfulFetch(
        `/sync/products/${syncProduct.id}`,
        token
      );

      const { sync_product, sync_variants } = detailResponse.result;

      const variants = sync_variants.map((sv: any, index: number) => ({
        id: sv.id,
        name: sv.name,
        size: sv.product?.variant?.size || sv.sku || "One Size",
        color: sv.product?.variant?.color || "Default",
        price: parseFloat(sv.retail_price) || 0,
        available: sv.availability_status !== "discontinued",
      }));

      const images: string[] = [];
      if (sync_product.thumbnail_url) {
        images.push(sync_product.thumbnail_url);
      }
      // Also pull preview images from variant files
      for (const sv of sync_variants) {
        if (sv.files) {
          for (const file of sv.files) {
            if (file.type === "preview" && file.preview_url && !images.includes(file.preview_url)) {
              images.push(file.preview_url);
            }
          }
        }
      }

      const basePrice = variants.length > 0
        ? Math.min(...variants.map((v: any) => v.price))
        : 0;

      const productData = {
        printfulId: sync_product.id,
        slug: slugify(sync_product.name),
        name: sync_product.name,
        description: sync_product.name,
        price: basePrice,
        images: images.length > 0 ? images : ["/placeholder.png"],
        categories: ["t-shirts"],
        tags: [] as string[],
        featured: false,
        variants,
        active: true,
      };

      await ctx.runMutation(internal.printful.upsertProduct, productData);
      synced++;
    }

    return { synced };
  },
});

export const upsertProduct = internalMutation({
  args: {
    printfulId: v.number(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    images: v.array(v.string()),
    categories: v.array(v.string()),
    tags: v.array(v.string()),
    featured: v.boolean(),
    variants: v.array(v.object({
      id: v.number(),
      name: v.string(),
      size: v.string(),
      color: v.string(),
      price: v.number(),
      available: v.boolean(),
    })),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_printful_id", (q) => q.eq("printfulId", args.printfulId))
      .unique();

    if (existing) {
      const { printfulId, ...updates } = args;
      // Preserve manually set fields
      await ctx.db.patch(existing._id, {
        ...updates,
        featured: existing.featured,
        categories: existing.categories.length > 0 ? existing.categories : updates.categories,
        tags: (existing.tags && existing.tags.length > 0) ? existing.tags : updates.tags,
      });
    } else {
      await ctx.db.insert("products", args);
    }
  },
});
