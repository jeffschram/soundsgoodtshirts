import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    category: v.optional(v.string()),
    tag: v.optional(v.string()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let products;

    if (args.featured === true) {
      products = await ctx.db
        .query("products")
        .withIndex("by_featured", (q) => q.eq("featured", true))
        .filter((q) => q.eq(q.field("active"), true))
        .collect();
    } else if (args.featured === false) {
      products = await ctx.db
        .query("products")
        .withIndex("by_featured", (q) => q.eq("featured", false))
        .filter((q) => q.eq(q.field("active"), true))
        .collect();
    } else {
      products = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("active"), true))
        .collect();
    }

    if (args.category) {
      products = products.filter(product =>
        product.categories.includes(args.category!)
      );
    }

    if (args.tag) {
      products = products.filter(product =>
        product.tags && product.tags.includes(args.tag!)
      );
    }

    return products;
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getByPrintfulId = query({
  args: { printfulId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_printful_id", (q) => q.eq("printfulId", args.printfulId))
      .unique();
  },
});

/**
 * NOTE: `create`, `update`, and `remove` were removed here.
 *
 * They were public, unauthenticated mutations accepting price, slug, active
 * and variants — callable by anyone with the deployment URL, which ships in
 * the client bundle. The admin UI already uses the requireAdmin-guarded
 * equivalents in convex/admin.ts (createProduct / updateProduct /
 * deleteProduct), and nothing in src/ referenced these. Use admin.* instead.
 */
