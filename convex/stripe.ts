import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

interface StripeLineItem {
  price_data: {
    currency: string;
    product_data: { name: string; description: string };
    unit_amount: number;
  };
  quantity: number;
}

export const createCheckoutSession = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<{ url: string | null }> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set. Add it in the Convex dashboard.");
    }

    const order = await ctx.runQuery(internal.stripe.getOrder, { id: args.orderId });
    if (!order) {
      throw new Error("Order not found");
    }

    const orderItems: Array<{
      productName: string;
      variantName: string;
      price: number;
      quantity: number;
    }> = await ctx.runQuery(internal.stripe.getOrderProducts, { orderId: args.orderId });

    const lineItems: StripeLineItem[] = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
          description: item.variantName,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const siteUrl = process.env.SITE_URL || "http://localhost:5173";

    const response: Response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(
        flattenForStripe({
          mode: "payment",
          success_url: `${siteUrl}/order/${args.orderId}?payment=success`,
          cancel_url: `${siteUrl}/cart?payment=cancelled`,
          customer_email: order.email,
          metadata: { orderId: args.orderId },
          line_items: lineItems,
        })
      ),
    });

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(`Stripe error: ${errorText}`);
    }

    const session: { id: string; url: string; payment_intent: string | null } =
      await response.json();

    await ctx.runMutation(internal.stripe.setCheckoutSession, {
      orderId: args.orderId,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? undefined,
    });

    return { url: session.url };
  },
});

export const getOrder = internalQuery({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getOrderProducts = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return [];

    const items: Array<{
      productName: string;
      variantName: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      items.push({
        productName: product?.name || "Unknown Product",
        variantName: variant ? `${variant.size} - ${variant.color}` : "Unknown Variant",
        price: item.price,
        quantity: item.quantity,
      });
    }
    return items;
  },
});

export const setCheckoutSession = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      stripeSessionId: args.stripeSessionId,
      ...(args.stripePaymentIntentId
        ? { stripePaymentIntentId: args.stripePaymentIntentId }
        : {}),
    });
  },
});

/**
 * Claim a Stripe event id. Returns true if it was already processed.
 *
 * Convex mutations are transactional, so this check-then-insert is safe against
 * concurrent redeliveries of the same event.
 */
export const recordEventOnce = internalMutation({
  args: { eventId: v.string(), type: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (existing) {
      return true;
    }

    await ctx.db.insert("stripeEvents", {
      eventId: args.eventId,
      type: args.type,
      processedAt: Date.now(),
    });
    return false;
  },
});

/**
 * Apply a payment status to an order.
 *
 * Resolution order: the `orderId` we put in session metadata, then the Checkout
 * Session id, then the payment intent id. All three are indexed — the previous
 * implementation collected the entire orders table on every webhook.
 */
export const applyPaymentStatus = internalMutation({
  args: {
    orderIdRaw: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args): Promise<{ matched: boolean }> => {
    let order = null;

    if (args.orderIdRaw) {
      // The metadata value came from outside, so it must be normalized rather
      // than cast — an arbitrary string would throw on ctx.db.get.
      const orderId = ctx.db.normalizeId("orders", args.orderIdRaw);
      if (orderId) {
        order = await ctx.db.get(orderId);
      }
    }

    if (!order && args.stripeSessionId) {
      order = await ctx.db
        .query("orders")
        .withIndex("by_stripe_session_id", (q) =>
          q.eq("stripeSessionId", args.stripeSessionId)
        )
        .unique();
    }

    if (!order && args.stripePaymentIntentId) {
      order = await ctx.db
        .query("orders")
        .withIndex("by_stripe_payment_intent", (q) =>
          q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
        )
        .unique();
    }

    if (!order) {
      return { matched: false };
    }

    await ctx.db.patch(order._id, {
      status: args.status,
      ...(args.stripePaymentIntentId
        ? { stripePaymentIntentId: args.stripePaymentIntentId }
        : {}),
    });

    // Payment confirmed: hand off to Printful. Scheduled rather than awaited so
    // the webhook still returns 200 promptly, and guarded on printfulOrderId so
    // a redelivered event cannot submit the order twice.
    if (args.status === "processing" && order.printfulOrderId === undefined) {
      await ctx.scheduler.runAfter(0, internal.printful.submitOrder, {
        orderId: order._id,
      });
    }

    return { matched: true };
  },
});

/**
 * Flatten nested objects into Stripe's URL-encoded format.
 * { line_items: [{ price_data: { currency: "usd" } }] }
 * => "line_items[0][price_data][currency]=usd"
 */
function flattenForStripe(
  obj: Record<string, unknown>,
  prefix = "",
  result: Record<string, string> = {}
): Record<string, string> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item: unknown, index: number) => {
        if (typeof item === "object" && item !== null) {
          flattenForStripe(item as Record<string, unknown>, `${fullKey}[${index}]`, result);
        } else {
          result[`${fullKey}[${index}]`] = String(item);
        }
      });
    } else if (typeof value === "object" && value !== null) {
      flattenForStripe(value as Record<string, unknown>, fullKey, result);
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}
