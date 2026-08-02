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

    await ctx.runMutation(internal.stripe.setPaymentIntent, {
      orderId: args.orderId,
      stripePaymentIntentId: session.payment_intent || session.id,
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

export const setPaymentIntent = internalMutation({
  args: {
    orderId: v.id("orders"),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      stripePaymentIntentId: args.stripePaymentIntentId,
    });
  },
});

export const fulfillOrder = internalMutation({
  args: {
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("orders").collect();
    const order = orders.find(
      (o) => o.stripePaymentIntentId === args.stripeSessionId
    );
    if (order) {
      await ctx.db.patch(order._id, { status: "processing" });
    }
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
