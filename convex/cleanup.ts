import { internalMutation, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * One-shot cleanup for the seeded demo catalog.
 *
 * The seeding code and UI were removed, but the rows survived. They are
 * identified by their placeholder image URLs — not by a missing `printfulId`,
 * because the seed data set fake ids (1, 2, 3). Products created by hand in
 * /admin/products also have no `printfulId`, so keying off that would delete
 * real inventory.
 */
const DEMO_IMAGE_PREFIX = "/api/placeholder/";

function isDemoProduct(product: Doc<"products">): boolean {
  return product.images.some((image) => image.startsWith(DEMO_IMAGE_PREFIX));
}

export const listDemoProducts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products.filter(isDemoProduct).map((product) => ({
      id: product._id,
      name: product.name,
      slug: product.slug,
      printfulId: product.printfulId,
      images: product.images,
    }));
  },
});

/**
 * Clear categories/tags on Printful-managed products so the next sync
 * repopulates them.
 *
 * `printful.upsertProduct` deliberately preserves non-empty categories and tags
 * so hand-curation survives a re-sync — which also means a bad mapping sticks.
 * Run this after changing how the sync derives taxonomy. It only touches rows
 * with a `printfulId`; hand-created products are left alone.
 */
export const clearSyncedTaxonomy = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    let cleared = 0;
    for (const product of products) {
      if (product.printfulId === undefined) continue;
      await ctx.db.patch(product._id, { categories: [], tags: [] });
      cleared++;
    }

    return { cleared };
  },
});

/**
 * Clear `description` on Printful-managed products.
 *
 * Before the copy split, the sync wrote Printful's garment blurb into
 * `description`. That text now belongs in `garmentDescription`, and leaving it
 * in `description` would make boilerplate masquerade as hand-written copy.
 * Run once, then re-sync to populate `garmentDescription`.
 */
export const clearSyncedDescriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    let cleared = 0;
    for (const product of products) {
      if (product.printfulId === undefined) continue;
      if (!product.description) continue;

      await ctx.db.patch(product._id, { description: undefined });
      cleared++;
    }

    return { cleared };
  },
});

export const deleteDemoProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const demoProducts = products.filter(isDemoProduct);

    const deleted: string[] = [];
    let removedCartItems = 0;

    for (const product of demoProducts) {
      // Remove cart lines first so cart.getItems never resolves a null product.
      const cartItems = await ctx.db
        .query("cartItems")
        .filter((q) => q.eq(q.field("productId"), product._id))
        .collect();

      for (const item of cartItems) {
        await ctx.db.delete(item._id);
        removedCartItems++;
      }

      await ctx.db.delete(product._id);
      deleted.push(product.name);
    }

    return { deleted, removedCartItems };
  },
});
