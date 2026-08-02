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

export const create = mutation({
  args: {
    printfulId: v.optional(v.number()),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    garmentDescription: v.optional(v.string()),
    price: v.number(),
    images: v.array(v.string()),
    categories: v.array(v.string()),
    tags: v.optional(v.array(v.string())),
    featured: v.boolean(),
    variants: v.array(v.object({
      id: v.number(),
      name: v.string(),
      size: v.string(),
      color: v.string(),
      price: v.number(),
      available: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      ...args,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    printfulId: v.optional(v.number()),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    garmentDescription: v.optional(v.string()),
    price: v.optional(v.number()),
    images: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    variants: v.optional(v.array(v.object({
      id: v.number(),
      name: v.string(),
      size: v.string(),
      color: v.string(),
      price: v.number(),
      available: v.boolean(),
    }))),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false });
  },
});