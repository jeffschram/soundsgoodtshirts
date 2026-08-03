import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_QUANTITY_PER_LINE = 25;

/** Money is stored in dollars, so keep it to cents and away from float drift. */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Can the caller read this order?
 *
 * The owning user, an admin, or anyone holding the order's access token — which
 * is how a guest sees their order after the Stripe redirect. Returning null
 * rather than throwing avoids confirming that an order id exists.
 */
async function canReadOrder(
  ctx: any,
  order: { userId?: Id<"users">; accessToken?: string },
  token?: string
): Promise<boolean> {
  if (token && order.accessToken && token === order.accessToken) {
    return true;
  }

  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }
  if (order.userId && order.userId === userId) {
    return true;
  }

  const user = await ctx.db.get(userId);
  return user?.isAdmin === true;
}

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
    if (args.items.length === 0) {
      throw new Error("Cannot create an order with no items.");
    }

    const userId = await getAuthUserId(ctx);

    const pricedItems: Array<{
      productId: Id<"products">;
      variantId: number;
      quantity: number;
      price: number;
    }> = [];
    let subtotal = 0;

    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}.`);
      }
      if (item.quantity > MAX_QUANTITY_PER_LINE) {
        throw new Error(
          `Quantity per item is limited to ${MAX_QUANTITY_PER_LINE}.`
        );
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
        throw new Error(
          `${product.name} (${variant.size} - ${variant.color}) is sold out.`
        );
      }

      // The Printful sync maps an unset retail_price to 0, so an unpriced
      // variant would otherwise create a free order.
      const price = variant.price > 0 ? variant.price : product.price;
      if (!(price > 0)) {
        throw new Error(`${product.name} is not priced and cannot be ordered.`);
      }

      pricedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
      });
      subtotal += price * item.quantity;
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
      accessToken: crypto.randomUUID(),
    });
  },
});

export const get = query({
  args: { id: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      return null;
    }
    if (!(await canReadOrder(ctx, order, args.token))) {
      return null;
    }
    // Never hand the token back to the client that is reading the order.
    const { accessToken, ...safe } = order;
    return safe;
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
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }
    // Same rule as `get` — this returns line items and product detail for the
    // order and was previously readable by anyone with an id.
    if (!(await canReadOrder(ctx, order, args.token))) {
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

/**
 * NOTE: `updateStatus` was removed here.
 *
 * It was a public, unauthenticated mutation accepting status,
 * printfulOrderId and stripePaymentIntentId — anyone could mark an order
 * shipped or attach a fake payment intent. Admins use the requireAdmin-guarded
 * admin.updateOrderStatus; the Stripe and Printful webhooks use internal
 * mutations in convex/stripe.ts and convex/printful.ts.
 */
