import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_QUANTITY_PER_LINE = 25;

/**
 * Create an order.
 *
 * Prices and the total are NOT accepted from the client — they are recomputed
 * here from the products table. This mutation is public by necessity (guest
 * checkout), so a client-supplied price would let anyone mint a $0.01 order,
 * and convex/stripe.ts bills straight from these stored values.
 */
export const create = mutation({
  args: {
    email: v.string(),
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
    if (args.items.length === 0) {
      throw new Error("Cannot create an order with no items.");
    }

    const userId = await getAuthUserId(ctx);

    const items: Array<{
      productId: Id<"products">;
      variantId: number;
      quantity: number;
      price: number;
    }> = [];
    let total = 0;

    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error("Quantity must be a positive whole number.");
      }
      if (item.quantity > MAX_QUANTITY_PER_LINE) {
        throw new Error(`Quantity per item is limited to ${MAX_QUANTITY_PER_LINE}.`);
      }

      const product = await ctx.db.get(item.productId);
      if (!product || !product.active) {
        throw new Error("A product in your cart is no longer available.");
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new Error(`Unknown variant for ${product.name}.`);
      }
      if (!variant.available) {
        throw new Error(
          `${product.name} (${variant.size} / ${variant.color}) is out of stock.`
        );
      }

      const price = variant.price > 0 ? variant.price : product.price;
      if (!(price > 0)) {
        throw new Error(`${product.name} is not priced and cannot be ordered.`);
      }

      items.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
      });
      total += price * item.quantity;
    }

    return await ctx.db.insert("orders", {
      email: args.email,
      shippingAddress: args.shippingAddress,
      items,
      // Rounded to cents so the stored total matches what Stripe is charged.
      total: Math.round(total * 100) / 100,
      userId: userId || undefined,
      status: "pending",
    });
  },
});

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
