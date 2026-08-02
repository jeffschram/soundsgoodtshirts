import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * The account this cart belongs to, or null for a guest.
 *
 * Convex Auth's Anonymous provider is enabled, so "authenticated" is not the
 * same as "has an account". An anonymous identity is per-device and disposable,
 * so treating it as signed in would attach carts to identities that vanish.
 * Anonymous users keep using the localStorage session cart.
 */
async function currentCartUserId(ctx: any): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const user = await ctx.db.get(userId);
  if (!user || user.isAnonymous) return null;

  return userId;
}

async function loadCartItems(
  ctx: any,
  sessionId: string
): Promise<Doc<"cartItems">[]> {
  const userId = await currentCartUserId(ctx);

  if (userId) {
    return await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  }

  const items = await ctx.db
    .query("cartItems")
    .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
    .collect();
  // Items already claimed by an account are not part of the guest cart.
  return items.filter((item: Doc<"cartItems">) => item.userId === undefined);
}

export const getItems = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartItems = await loadCartItems(ctx, args.sessionId);

    return await Promise.all(
      cartItems.map(async (item) => ({
        ...item,
        product: await ctx.db.get(item.productId),
      }))
    );
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
    if (!Number.isInteger(args.quantity) || args.quantity < 1) {
      throw new Error("Quantity must be a positive whole number.");
    }

    const userId = await currentCartUserId(ctx);
    const existingItems = await loadCartItems(ctx, args.sessionId);

    const existingItem = existingItems.find(
      (item) =>
        item.productId === args.productId && item.variantId === args.variantId
    );

    if (existingItem) {
      return await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
      });
    }

    return await ctx.db.insert("cartItems", {
      sessionId: args.sessionId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      ...(userId ? { userId } : {}),
    });
  },
});

/**
 * Carts are keyed by a client-generated session id, so any mutation taking a
 * cartItems id must prove the item belongs to the caller — otherwise a guessed
 * id lets anyone edit a stranger's cart.
 */
async function requireOwnedCartItem(
  ctx: any,
  itemId: Id<"cartItems">,
  sessionId: string
) {
  const item = await ctx.db.get(itemId);
  if (!item) {
    throw new Error("Cart item not found.");
  }

  const userId = await currentCartUserId(ctx);
  const ownedByUser = userId !== null && item.userId === userId;
  const ownedBySession = item.userId === undefined && item.sessionId === sessionId;

  if (!ownedByUser && !ownedBySession) {
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
    const items = await loadCartItems(ctx, args.sessionId);
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});

/**
 * Move a guest cart onto the signed-in account.
 *
 * Called once per sign-in transition. Quantities for the same product/variant
 * combine into one line rather than creating duplicates, and guest rows are
 * either claimed or deleted so nothing can be merged twice.
 */
export const mergeGuestCart = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await currentCartUserId(ctx);
    if (!userId) {
      return { merged: 0 };
    }

    const guestItems = (
      await ctx.db
        .query("cartItems")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect()
    ).filter((item) => item.userId === undefined);

    if (guestItems.length === 0) {
      return { merged: 0 };
    }

    const userItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let merged = 0;
    for (const guestItem of guestItems) {
      const existing = userItems.find(
        (item) =>
          item.productId === guestItem.productId &&
          item.variantId === guestItem.variantId
      );

      if (existing) {
        await ctx.db.patch(existing._id, {
          quantity: existing.quantity + guestItem.quantity,
        });
        await ctx.db.delete(guestItem._id);
      } else {
        await ctx.db.patch(guestItem._id, { userId });
      }
      merged++;
    }

    return { merged };
  },
});

export const getCartTotal = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartItems = await loadCartItems(ctx, args.sessionId);

    let total = 0;
    let itemCount = 0;

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) continue;

      total += variant.price * item.quantity;
      itemCount += item.quantity;
    }

    return { total: Math.round(total * 100) / 100, itemCount };
  },
});
