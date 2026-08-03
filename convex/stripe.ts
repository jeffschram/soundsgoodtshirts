import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { quoteShippingRate, type ShippingQuote } from "./printful";

const STRIPE_API_URL = "https://api.stripe.com/v1";

interface StripeLineItem {
  price_data: {
    currency: string;
    product_data: { name: string; description: string; tax_code?: string };
    unit_amount: number;
    tax_behavior?: string;
  };
  quantity: number;
}

interface StripeSession {
  id: string;
  url: string;
  payment_intent: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  total_details?: {
    amount_tax?: number | null;
    amount_shipping?: number | null;
    amount_discount?: number | null;
  } | null;
}

/**
 * Stripe Tax is opt-in because enabling it here without enabling it on the
 * Stripe account makes session creation fail outright — which would take
 * checkout down rather than just leaving tax uncollected. Set
 * STRIPE_AUTOMATIC_TAX=true in the Convex environment once Stripe Tax is
 * active in the dashboard. See the README.
 */
function automaticTaxEnabled(): boolean {
  return process.env.STRIPE_AUTOMATIC_TAX === "true";
}

async function stripePost(
  secretKey: string,
  path: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await fetch(`${STRIPE_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(flattenForStripe(payload)),
  });

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error(`Stripe error: ${errorText}`);
  }

  return await response.json();
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
    if (order.status !== "pending") {
      throw new Error("This order has already been submitted for payment.");
    }

    const orderItems: Array<{
      productName: string;
      variantName: string;
      price: number;
      quantity: number;
      variantId: number;
      printfulVariantId?: number;
    }> = await ctx.runQuery(internal.stripe.getOrderProducts, { orderId: args.orderId });

    // Prices come from the order, which orders.create built from the products
    // table — never from the client.
    const lineItems: StripeLineItem[] = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
          description: item.variantName,
          // Apparel is taxed differently from general goods in several states
          // (PA, NJ, and MN exempt clothing entirely), so the right tax code
          // matters. Left unset by default so a bad value can't break
          // checkout; set STRIPE_APPAREL_TAX_CODE to Stripe's clothing code
          // and Stripe uses it instead of the account default.
          ...(process.env.STRIPE_APPAREL_TAX_CODE
            ? { tax_code: process.env.STRIPE_APPAREL_TAX_CODE }
            : {}),
        },
        unit_amount: Math.round(item.price * 100),
        // Tax is added on top of the listed price rather than assumed to be
        // baked into it. Required when automatic tax is on.
        tax_behavior: "exclusive",
      },
      quantity: item.quantity,
    }));

    // Quote shipping here, in the action, from the persisted address — not
    // from whatever the checkout page displayed.
    const shippingQuote: ShippingQuote = await quoteShippingRate(
      order.shippingAddress,
      orderItems.map((item) => ({
        printfulVariantId: item.printfulVariantId,
        quantity: item.quantity,
      })),
    );
    const shippingCents = Math.round(shippingQuote.amount * 100);

    const siteUrl = process.env.SITE_URL || "http://localhost:5173";
    const useAutomaticTax = automaticTaxEnabled();

    const sessionPayload: Record<string, unknown> = {
      mode: "payment",
      // The token lets a guest read their own order after the redirect,
      // so the order id alone never grants access.
      success_url: `${siteUrl}/order/${args.orderId}?payment=success${
        order.accessToken ? `&token=${order.accessToken}` : ""
      }`,
      cancel_url: `${siteUrl}/cart?payment=cancelled`,
      metadata: { orderId: args.orderId },
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCents, currency: "usd" },
            display_name: shippingQuote.serviceName || "Standard Shipping",
            tax_behavior: "exclusive",
          },
        },
      ],
    };

    if (useAutomaticTax) {
      // Stripe needs an address to calculate tax. We already collected one, so
      // attach it to a Customer rather than making the shopper type it again
      // into Stripe's own address form.
      const address = {
        line1: order.shippingAddress.address1,
        ...(order.shippingAddress.address2
          ? { line2: order.shippingAddress.address2 }
          : {}),
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postal_code: order.shippingAddress.zip,
        country: order.shippingAddress.country,
      };

      const customer: { id: string } = await stripePost(
        stripeSecretKey,
        "/customers",
        {
          email: order.email,
          name: order.shippingAddress.name,
          address,
          shipping: { name: order.shippingAddress.name, address },
          metadata: { orderId: args.orderId },
        },
      );

      sessionPayload.customer = customer.id;
      sessionPayload.automatic_tax = { enabled: true };
    } else {
      // customer_email and customer are mutually exclusive.
      sessionPayload.customer_email = order.email;
    }

    const session: StripeSession = await stripePost(
      stripeSecretKey,
      "/checkout/sessions",
      sessionPayload,
    );

    await ctx.runMutation(internal.stripe.setCheckoutSession, {
      orderId: args.orderId,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? undefined,
    });

    // Read the authoritative numbers back off the session Stripe just priced,
    // so the stored breakdown is what the customer is actually being charged
    // rather than our own arithmetic.
    const subtotalCents =
      session.amount_subtotal ?? Math.round((order.subtotal ?? 0) * 100);
    const taxCents = session.total_details?.amount_tax ?? 0;
    const chargedShippingCents =
      session.total_details?.amount_shipping ?? shippingCents;
    const totalCents =
      session.amount_total ?? subtotalCents + chargedShippingCents + taxCents;

    await ctx.runMutation(internal.stripe.setOrderTotals, {
      orderId: args.orderId,
      subtotal: subtotalCents / 100,
      shipping: chargedShippingCents / 100,
      tax: taxCents / 100,
      total: totalCents / 100,
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
      variantId: number;
      printfulVariantId?: number;
    }> = [];

    for (const item of order.items) {
      const product = await ctx.db.get(item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      items.push({
        productName: product?.name || "Unknown Product",
        variantName: variant ? `${variant.size} - ${variant.color}` : "Unknown Variant",
        price: item.price,
        quantity: item.quantity,
        variantId: item.variantId,
        printfulVariantId: variant?.printfulVariantId,
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

/**
 * Persist the breakdown Stripe priced, so /order/:id and admin can show where
 * the charge came from and it can be reconciled against Printful's invoice.
 */
export const setOrderTotals = internalMutation({
  args: {
    orderId: v.id("orders"),
    subtotal: v.number(),
    shipping: v.number(),
    tax: v.number(),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    const { orderId, ...updates } = args;
    await ctx.db.patch(orderId, updates);
  },
});
