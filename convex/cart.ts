import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getItems = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const itemsWithProducts = await Promise.all(
      cartItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    return itemsWithProducts;
  },
});

export const addItem = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    variantId: v.number(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if item already exists in cart
    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => 
        q.and(
          q.eq(q.field("productId"), args.productId),
          q.eq(q.field("variantId"), args.variantId)
        )
      )
      .first();

    if (existingItem) {
      // Update quantity
      return await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
      });
    } else {
      // Add new item
      return await ctx.db.insert("cartItems", args);
    }
  },
});

export const updateQuantity = mutation({
  args: {
    itemId: v.id("cartItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      return await ctx.db.delete(args.itemId);
    }
    return await ctx.db.patch(args.itemId, { quantity: args.quantity });
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.itemId);
  },
});

export const clearCart = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});

export const getCartTotal = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    let total = 0;
    let itemCount = 0;

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) {
          total += variant.price * item.quantity;
          itemCount += item.quantity;
        }
      }
    }

    return { total, itemCount };
  },
});
