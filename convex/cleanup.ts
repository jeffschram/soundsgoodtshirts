import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
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

/**
 * Delete orders placed against test email addresses.
 *
 * Verification runs create real orders; this removes them so /admin/orders and
 * the dashboard revenue figure are not polluted. Matches @example.com only.
 */
export const deleteTestOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();

    const deleted: string[] = [];
    for (const order of orders) {
      if (!order.email.endsWith("@example.com")) continue;
      await ctx.db.delete(order._id);
      deleted.push(order.email);
    }

    return { deleted: deleted.length };
  },
});

// ---- Printful store migration (Squarespace-connected -> manual/API store) ----

/**
 * Snapshot the hand-curated fields before the store swap.
 *
 * A sync against the new store inserts NEW rows (upsertProduct matches on
 * printfulId, and the new store issues new ids), so everything curated stays
 * behind on the old rows. Keyed by slug, which is stable — upsertProduct never
 * rewrites an existing product's slug.
 */
export const exportCuration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products
      .filter((product) => product.printfulId !== undefined)
      .map((product) => ({
        slug: product.slug,
        name: product.name,
        description: product.description,
        customImages: product.customImages ?? [],
        featured: product.featured,
        categories: product.categories,
        tags: product.tags ?? [],
      }));
  },
});

/**
 * Free the slugs and retire the old catalog without breaking order history.
 *
 * Renames rather than deletes: orders reference productId, and deleting the
 * rows would make historical orders render "Unknown Product" — the exact bug
 * archive-instead-of-delete was introduced to prevent.
 */
export const archiveLegacyProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    let archived = 0;
    for (const product of products) {
      if (product.printfulId === undefined) continue;
      if (product.slug.startsWith("archived-")) continue;

      await ctx.db.patch(product._id, {
        slug: `archived-${product.slug}-${product.printfulId}`,
        active: false,
        featured: false,
      });
      archived++;
    }

    return { archived };
  },
});

/**
 * Re-apply curation to the freshly synced products, matching on the original
 * slug. Clears customImages from the archived row afterwards so exactly one
 * product owns each storage file — otherwise hard-deleting the old row later
 * would delete files the live product is still using.
 */
export const applyCuration = internalMutation({
  args: {
    entries: v.array(
      v.object({
        slug: v.string(),
        description: v.optional(v.string()),
        customImages: v.array(v.id("_storage")),
        featured: v.boolean(),
        categories: v.array(v.string()),
        tags: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const entry of args.entries) {
      const target = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", entry.slug))
        .unique();

      if (!target || target.printfulId === undefined) {
        skipped.push(entry.slug);
        continue;
      }

      await ctx.db.patch(target._id, {
        ...(entry.description ? { description: entry.description } : {}),
        ...(entry.customImages.length
          ? { customImages: entry.customImages }
          : {}),
        featured: entry.featured,
        ...(entry.categories.length ? { categories: entry.categories } : {}),
        ...(entry.tags.length ? { tags: entry.tags } : {}),
      });

      // Hand off ownership of the storage files.
      if (entry.customImages.length) {
        const legacy = (await ctx.db.query("products").collect()).filter(
          (product) =>
            product.slug.startsWith(`archived-${entry.slug}-`) &&
            (product.customImages ?? []).length > 0
        );
        for (const row of legacy) {
          await ctx.db.patch(row._id, { customImages: [] });
        }
      }

      applied.push(entry.slug);
    }

    return { applied, skipped };
  },
});

export const clearAllCarts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("cartItems").collect();
    for (const item of items) await ctx.db.delete(item._id);
    return { cleared: items.length };
  },
});

/**
 * One-shot prune after seeding production from a dev snapshot.
 *
 * The snapshot carries products, storage files and the admin user — which is
 * the point — but also every test order and sandbox Stripe event. Those are not
 * harmless: admin.dashboardStats sums `total` across ALL orders, so production
 * would open showing fabricated revenue, and one test order carries a fake
 * tracking number. Archived products only existed to keep that test history
 * readable, so they go with it.
 *
 * Deliberately leaves storage files alone: the live products still reference
 * them, and the archived rows had customImages cleared during the Printful
 * store migration.
 */
export const resetForProduction = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) await ctx.db.delete(order._id);

    const events = await ctx.db.query("stripeEvents").collect();
    for (const event of events) await ctx.db.delete(event._id);

    const carts = await ctx.db.query("cartItems").collect();
    for (const item of carts) await ctx.db.delete(item._id);

    const products = await ctx.db.query("products").collect();
    let archivedRemoved = 0;
    for (const product of products) {
      if (!product.slug.startsWith("archived-")) continue;
      // Guard: never orphan a storage file that is still referenced.
      if ((product.customImages ?? []).length > 0) continue;
      await ctx.db.delete(product._id);
      archivedRemoved++;
    }

    return {
      ordersRemoved: orders.length,
      stripeEventsRemoved: events.length,
      cartItemsRemoved: carts.length,
      archivedProductsRemoved: archivedRemoved,
      productsRemaining: products.length - archivedRemoved,
    };
  },
});
