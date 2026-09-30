import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/**
 * Normalize a free-string product category into a collection slug.
 *
 * Categories are hand-typed in /admin/products and written by the Printful
 * sync, so the same collection shows up as "Spaghetti", "spaghetti" and
 * "Spaghetti Shirts" depending on who typed it. Membership compares the
 * normalized form, which means a collection with slug "spaghetti" picks up
 * every spelling without anyone having to go re-type product categories.
 *
 * Shared with convex/admin.ts so create/update validate slugs against exactly
 * the rule membership is resolved by.
 */
export function categorySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isMember(product: Doc<"products">, slug: string): boolean {
  return product.categories.some((category) => categorySlug(category) === slug);
}

/**
 * Active products belonging to a collection, with the leading custom image
 * resolved.
 *
 * Filtered in memory rather than through the `by_category` index: that index
 * is on the whole `categories` array, so it can only answer exact-array
 * equality, not "array contains". convex/products.ts `list` filters the same
 * way for the same reason.
 */
async function membersOf(ctx: QueryCtx, slug: string) {
  const products = await ctx.db
    .query("products")
    .filter((q) => q.eq(q.field("active"), true))
    .collect();

  return await Promise.all(
    products
      .filter((product) => isMember(product, slug))
      .map(async (product) => ({
        ...product,
        // Only the first: the grid renders one thumbnail per product, and
        // resolving every image is a URL lookup per image per query.
        customImageUrls: product.customImages?.length
          ? [await ctx.storage.getUrl(product.customImages[0])].filter(
              (url): url is string => url !== null,
            )
          : [],
      })),
  );
}

function byOrderThenName(a: Doc<"collections">, b: Doc<"collections">) {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/**
 * Active collections, in display order.
 *
 * `homepageOnly` narrows to the ones flagged for the homepage.
 */
export const list = query({
  args: { homepageOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query("collections")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    return collections
      .filter((collection) => !args.homepageOnly || collection.showOnHomepage)
      .sort(byOrderThenName);
  },
});

/**
 * The homepage's drop sections: each active, homepage-flagged collection
 * together with its member products, in one round trip.
 *
 * Returned as a single query so the homepage does not have to fan out a
 * useQuery per collection, which would mean hooks inside a map.
 */
export const homepageSections = query({
  args: {},
  handler: async (ctx) => {
    const collections = await ctx.db
      .query("collections")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    return await Promise.all(
      collections
        .filter((collection) => collection.showOnHomepage)
        .sort(byOrderThenName)
        .map(async (collection) => ({
          ...collection,
          products: await membersOf(ctx, collection.slug),
        })),
    );
  },
});

/**
 * One active collection and its member products, or null for an unknown or
 * archived slug so the page can render a not-found state.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", categorySlug(args.slug)))
      .unique();

    if (!collection || !collection.active) {
      return null;
    }

    return { ...collection, products: await membersOf(ctx, collection.slug) };
  },
});
