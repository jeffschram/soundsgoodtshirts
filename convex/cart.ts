import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

/**
 * Carts are keyed by a client-generated session id, so any mutation that takes
 * a cartItems id must prove the item belongs to the caller's session —
 * otherwise a guessed id lets anyone edit a stranger's cart.
 */
async function requireOwnedCartItem(
  ctx: { db: any },
  itemId: Id<"cartItems">,
  sessionId: string
) {
  const item = await ctx.db.get(itemId);
  if (!item || item.sessionId !== sessionId) {
    throw new Error("Cart item not found.");
  }
  return item;
}

export const updateQuantity = mutation({
  args: {
    itemId: v.id("cartItems"),
    sessionId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOwnedCartItem(ctx, args.itemId, args.sessionId);

    if (args.quantity <= 0) {
      return await ctx.db.delete(args.itemId);
    }
    if (!Number.isInteger(args.quantity)) {
      throw new Error("Quantity must be a whole number.");
    }
    return await ctx.db.patch(args.itemId, { quantity: args.quantity });
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("cartItems"), sessionId: v.string() },
  handler: async (ctx, args) => {
    await requireOwnedCartItem(ctx, args.itemId, args.sessionId);
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
