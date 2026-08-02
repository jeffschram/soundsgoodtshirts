import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  products: defineTable({
    printfulId: v.optional(v.number()),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
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
    printfulOrderId: v.optional(v.number()),
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
    .index("by_status", ["status"]),

  cartItems: defineTable({
    sessionId: v.string(),
    productId: v.id("products"),
    variantId: v.number(),
    quantity: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_product", ["productId"]),
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
