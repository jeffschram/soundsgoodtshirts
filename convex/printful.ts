import { internalAction, internalMutation } from "./_generated/server";
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
    const body = await response.text().catch(() => "");
    throw new Error(
      `Printful API error: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`
    );
  }

  return response.json();
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

      const description: string =
        typeof catalogProduct?.description === "string" &&
        catalogProduct.description.trim().length > 0
          ? catalogProduct.description.trim()
          : sync_product.name;

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
        description,
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
    description: v.string(),
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
