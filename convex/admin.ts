import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

/**
 * Grant (or revoke) admin on a user by email, for bootstrapping the very first
 * admin on a deployment where no admin exists yet.
 *
 * `setUserAdmin` above calls `requireAdmin`, so on a fresh deployment there is
 * no way to create the first admin through the app. This is an
 * `internalMutation`: it is NOT part of the public API and cannot be called
 * from a browser, the React client, or an HTTP request. The only way to run it
 * is the Convex dashboard's function runner, which already requires access to
 * the deployment.
 *
 * This is deliberately manual. A public "make me admin if there are no admins
 * yet" mutation is a race that the first visitor to a new deployment wins.
 *
 * See the "Creating the first admin user" section of the README for the steps.
 */
export const bootstrapAdmin = internalMutation({
  args: {
    email: v.string(),
    // Defaults to granting admin. Pass false to revoke.
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const grant = args.isAdmin ?? true;
    const email = args.email.trim();

    if (!email) {
      throw new Error("An email is required.");
    }

    // Try the index first, then fall back to a case-insensitive scan, since
    // how the auth provider normalizes the stored email is not guaranteed.
    let matches = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .collect();

    if (matches.length === 0) {
      const target = email.toLowerCase();
      const allUsers = await ctx.db.query("users").collect();
      matches = allUsers.filter((u) => u.email?.toLowerCase() === target);
    }

    if (matches.length === 0) {
      throw new Error(
        `No user found with email "${email}". Sign up on the site with that ` +
          `address first, then run this again.`,
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `Found ${matches.length} users with email "${email}": ` +
          `${matches.map((u) => u._id).join(", ")}. Resolve the duplicates, ` +
          `then use setUserAdmin with the specific user id instead.`,
      );
    }

    const user = matches[0];

    if (grant && user.isAnonymous) {
      throw new Error(
        `User ${user._id} is an anonymous account. Sign up with a password ` +
          `first so the admin account has real credentials.`,
      );
    }

    await ctx.db.patch(user._id, { isAdmin: grant });

    return {
      userId: user._id,
      email: user.email,
      isAdmin: grant,
      message: grant
        ? `Granted admin to ${user.email}. Reload the site and open /admin.`
        : `Revoked admin from ${user.email}.`,
    };
  },
});

/**
 * How many admins this deployment has. Internal — used to confirm the
 * bootstrap worked, and to check whether a deployment still needs one.
 */
export const countAdmins = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const admins = users.filter((u) => u.isAdmin);
    return {
      adminCount: admins.length,
      totalUsers: users.length,
      adminEmails: admins.map((u) => u.email ?? "(no email)"),
    };
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
