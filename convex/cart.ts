import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * The user id a cart should be keyed by, or null to fall back to the guest
 * session id.
 *
 * Convex Auth's Anonymous provider is enabled in `convex/auth.ts`, so an
 * anonymous visitor is technically authenticated and `getAuthUserId` returns an
 * id for them. We deliberately treat anonymous identities as guests here.
 *
 * The reason: signing up with a password later creates a *different* user
 * document, so a cart parked on the anonymous user would be stranded at exactly
 * the moment this feature exists to prevent. Keeping anonymous visitors on the
 * localStorage session id means the merge fires against the real account and
 * their cart follows them.
 */
async function getCartUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  if (!user || user.isAnonymous) return null;
  return userId;
}

/** Every cart row for the current owner — the signed-in user, else the guest session. */
async function getOwnedItems(
  ctx: QueryCtx,
  sessionId: string,
): Promise<Array<Doc<"cartItems">>> {
  const userId = await getCartUserId(ctx);
  if (userId) {
    return await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  }
  return await ctx.db
    .query("cartItems")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
}

export const getItems = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartItems = await getOwnedItems(ctx, args.sessionId);

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
    const userId = await getCartUserId(ctx);
    const ownedItems = await getOwnedItems(ctx, args.sessionId);

    // Check if this product/variant is already in the cart
    const existingItem = ownedItems.find(
      (item) =>
        item.productId === args.productId && item.variantId === args.variantId
    );

    if (existingItem) {
      // Update quantity
      return await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
      });
    }

    // A row belongs to the user or the session, never both.
    return await ctx.db.insert("cartItems", {
      sessionId: userId ? undefined : args.sessionId,
      userId: userId ?? undefined,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
    });
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
    const items = await getOwnedItems(ctx, args.sessionId);

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});

/**
 * Move a guest cart onto the signed-in user, combining quantities where the
 * same product/variant is already in their cart.
 *
 * Safe to call more than once: a successful merge leaves no rows on the guest
 * session, so a repeat call finds nothing and is a no-op. The client still
 * guards against re-firing (see CartContext), but correctness does not depend
 * on that guard holding.
 */
export const mergeGuestCart = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getCartUserId(ctx);
    if (!userId) {
      // Signed out, or an anonymous identity — nothing to merge onto.
      return { moved: 0, combined: 0 };
    }

    const guestItems = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    if (guestItems.length === 0) {
      return { moved: 0, combined: 0 };
    }

    const userItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let moved = 0;
    let combined = 0;

    for (const guestItem of guestItems) {
      const existing = userItems.find(
        (item) =>
          item.productId === guestItem.productId &&
          item.variantId === guestItem.variantId
      );

      if (existing) {
        // Same product/variant already on the account — fold the quantities
        // into the one line and drop the guest row.
        existing.quantity += guestItem.quantity;
        await ctx.db.patch(existing._id, { quantity: existing.quantity });
        await ctx.db.delete(guestItem._id);
        combined++;
      } else {
        // Hand the row to the user and unset sessionId, so it no longer
        // belongs to the guest session and cannot be merged twice.
        await ctx.db.patch(guestItem._id, {
          userId,
          sessionId: undefined,
        });
        // Track it so a second guest row for the same product/variant folds
        // into this one instead of creating a duplicate line.
        userItems.push({ ...guestItem, userId, sessionId: undefined });
        moved++;
      }
    }

    return { moved, combined };
  },
});

export const getCartTotal = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const cartItems = await getOwnedItems(ctx, args.sessionId);

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
