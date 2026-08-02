import { query, mutation, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user?.isAdmin) {
    throw new Error("Not authorized");
  }
  return user;
}

// ---- Products ----

export const listAllProducts = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("products").order("desc").collect();
  },
});

export const createProduct = mutation({
  args: {
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
    printfulId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("products", { ...args, active: true });
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    images: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    variants: v.optional(v.array(v.object({
      id: v.number(),
      name: v.string(),
      size: v.string(),
      color: v.string(),
      price: v.number(),
      available: v.boolean(),
    }))),
    active: v.optional(v.boolean()),
    printfulId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Admin-only entry point for the Printful sync.
 *
 * Actions have no `ctx.db`, so the admin check runs through an internal query.
 */
export const isCurrentUserAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    const user = await ctx.db.get(userId);
    return user?.isAdmin === true;
  },
});

export const syncPrintfulProducts = action({
  args: {},
  handler: async (ctx): Promise<{ synced: number; deactivated: number }> => {
    const isAdmin: boolean = await ctx.runQuery(
      internal.admin.isCurrentUserAdmin,
      {}
    );
    if (!isAdmin) {
      throw new Error("Not authorized");
    }
    return await ctx.runAction(internal.printful.syncProducts, {});
  },
});

// ---- Orders ----

export const listAllOrders = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("orders").order("desc").collect();
  },
});

export const updateOrderStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.patch(args.id, { status: args.status });
  },
});

// ---- Users ----

export const listAllUsers = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const setUserAdmin = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.patch(args.userId, { isAdmin: args.isAdmin });
  },
});

// ---- Dashboard stats ----

export const dashboardStats = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const products = await ctx.db.query("products").collect();
    const orders = await ctx.db.query("orders").collect();
    const users = await ctx.db.query("users").collect();

    const activeProducts = products.filter(p => p.active).length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter(o => o.status === "pending").length;

    return {
      totalProducts: products.length,
      activeProducts,
      totalOrders: orders.length,
      pendingOrders,
      totalRevenue,
      totalUsers: users.length,
    };
  },
});
