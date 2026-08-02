import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    email: v.string(),
    // Note: no price and no total. Both are read from the products table
    // below, so a tampered client cannot choose what it pays.
    items: v.array(v.object({
      productId: v.id("products"),
      variantId: v.number(),
      quantity: v.number(),
    })),
    shippingAddress: v.object({
      name: v.string(),
      address1: v.string(),
      address2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      country: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (args.items.length === 0) {
      throw new Error("Cannot create an order with no items.");
    }

    const pricedItems = [];
    let subtotal = 0;

    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}.`);
      }

      const product = await ctx.db.get(item.productId);
      if (!product || !product.active) {
        throw new Error("A product in this order is no longer available.");
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new Error(`Unknown variant for ${product.name}.`);
      }
      if (!variant.available) {
        throw new Error(`${product.name} (${variant.size} - ${variant.color}) is sold out.`);
      }

      pricedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: variant.price,
      });
      subtotal += variant.price * item.quantity;
    }

    subtotal = roundCurrency(subtotal);

    // Shipping and tax are filled in by stripe.createCheckoutSession, which
    // can make the outbound calls a mutation can't. Until then the order
    // total is the subtotal.
    return await ctx.db.insert("orders", {
      email: args.email,
      items: pricedItems,
      shippingAddress: args.shippingAddress,
      subtotal,
      shipping: 0,
      tax: 0,
      total: subtotal,
      userId: userId || undefined,
      status: "pending",
    });
  },
});

/** Money is stored in dollars, so keep it to cents and away from float drift. */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export const get = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getOrderItems = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    const itemsWithProducts = await Promise.all(
      order.items.map(async (item) => {
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

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
    printfulOrderId: v.optional(v.number()),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});
