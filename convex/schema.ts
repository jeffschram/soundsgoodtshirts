import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  products: defineTable({
    printfulId: v.optional(v.number()),
    slug: v.string(),
    name: v.string(),
    // The copy the storefront leads with: hand-written in /admin/products.
    // The Printful sync never writes this field.
    description: v.optional(v.string()),
    // Printful's catalog blurb about the garment itself (fabric, fit, care),
    // shown behind the "About the shirt" toggle. Sync-owned; overwritten on
    // every run.
    garmentDescription: v.optional(v.string()),
    price: v.number(),
    images: v.array(v.string()),
    categories: v.array(v.string()),
    tags: v.optional(v.array(v.string())),
    featured: v.boolean(),
    variants: v.array(v.object({
      id: v.number(),
      name: v.string(),
      size: v.string(),
      color: v.string(),
      price: v.number(),
      available: v.boolean(),
    })),
    active: v.boolean(),
  }).index("by_featured", ["featured"])
    .index("by_category", ["categories"])
    .index("by_tags", ["tags"])
    .index("by_printful_id", ["printfulId"])
    .index("by_slug", ["slug"]),

  orders: defineTable({
    userId: v.optional(v.id("users")),
    email: v.string(),
    items: v.array(v.object({
      productId: v.id("products"),
      variantId: v.number(),
      quantity: v.number(),
      price: v.number(),
    })),
    total: v.number(),
    status: v.string(),
    // Unguessable token letting a guest view their own order after checkout.
    // The order _id is not a secret — it ends up in history, referrers and
    // shared links — so it cannot be the thing that grants access.
    accessToken: v.optional(v.string()),
    printfulOrderId: v.optional(v.number()),
    // Last fulfillment error, retained so a stuck paid order is visible in
    // /admin/orders rather than silently sitting in "processing".
    fulfillmentError: v.optional(v.string()),
    shipment: v.optional(v.object({
      carrier: v.optional(v.string()),
      trackingNumber: v.optional(v.string()),
      trackingUrl: v.optional(v.string()),
      shippedAt: v.optional(v.number()),
    })),
    // The Checkout Session id, known at session creation. `payment_intent` is
    // null on a fresh session, so this is the identifier a webhook can be
    // matched on reliably.
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    shippingAddress: v.object({
      name: v.string(),
      address1: v.string(),
      address2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      country: v.string(),
    }),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_stripe_session_id", ["stripeSessionId"])
    .index("by_stripe_payment_intent", ["stripePaymentIntentId"])
    .index("by_printful_order_id", ["printfulOrderId"]),

  // Processed Stripe event ids. Stripe retries deliveries, so fulfillment must
  // be keyed on the event id to stay idempotent.
  stripeEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    processedAt: v.number(),
  }).index("by_event_id", ["eventId"]),

  cartItems: defineTable({
    sessionId: v.string(),
    // Set once a guest cart is merged into an account, after which the cart
    // follows the user across devices instead of the localStorage session.
    userId: v.optional(v.id("users")),
    productId: v.id("products"),
    variantId: v.number(),
    quantity: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  // Extend the users table with an isAdmin flag
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
  }).index("email", ["email"]),
  ...applicationTables,
});
