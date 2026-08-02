import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_HARD_DELETE_ORDER_SCAN = 5_000;

const productVariantValidator = v.object({
  id: v.number(),
  name: v.string(),
  size: v.string(),
  color: v.string(),
  price: v.number(),
  available: v.boolean(),
});

function normalizedList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizedSlug(value: string): string {
  return value.trim().toLowerCase();
}

function validateProductInput(product: {
  name: string;
  slug: string;
  price: number;
  images: string[];
  variants: Array<{ price: number }>;
}) {
  if (!product.name.trim()) {
    throw new Error("Product name is required.");
  }
  if (!product.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) {
    throw new Error(
      "Slug must contain lowercase letters, numbers, and single hyphens only.",
    );
  }
  if (!Number.isFinite(product.price) || product.price < 0) {
    throw new Error("Product price must be zero or greater.");
  }
  if (
    product.images.length === 0 ||
    product.images.some((image) => !image.trim())
  ) {
    throw new Error("Add at least one product image URL.");
  }
  if (product.variants.length === 0) {
    throw new Error("Add at least one product variant.");
  }
  if (
    product.variants.some(
      (variant) => !Number.isFinite(variant.price) || variant.price < 0,
    )
  ) {
    throw new Error("Variant prices must be zero or greater.");
  }
}

async function assertUniqueSlug(ctx: any, slug: string, exceptId?: string) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .first();
  if (existing && existing._id !== exceptId) {
    throw new Error(`The slug “${slug}” is already used by another product.`);
  }
}

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
    variants: v.array(productVariantValidator),
    active: v.optional(v.boolean()),
    printfulId: v.optional(v.number()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { tags, ...rest } = args;
    const product = {
      ...rest,
      name: args.name.trim(),
      slug: normalizedSlug(args.slug),
      images: normalizedList(args.images),
      categories: normalizedList(args.categories),
      ...(tags !== undefined ? { tags: normalizedList(tags) } : {}),
      active: args.active ?? true,
    };
    validateProductInput(product);
    await assertUniqueSlug(ctx, product.slug);
    return await ctx.db.insert("products", product);
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
    variants: v.optional(v.array(productVariantValidator)),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Product not found.");
    }

    const { id, ...updates } = args;
    const normalizedUpdates = {
      ...updates,
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.slug !== undefined
        ? { slug: normalizedSlug(updates.slug) }
        : {}),
      ...(updates.images !== undefined
        ? { images: normalizedList(updates.images) }
        : {}),
      ...(updates.categories !== undefined
        ? { categories: normalizedList(updates.categories) }
        : {}),
      ...(updates.tags !== undefined
        ? { tags: normalizedList(updates.tags) }
        : {}),
    };
    const next = { ...existing, ...normalizedUpdates };

    validateProductInput(next);
    await assertUniqueSlug(ctx, next.slug, id);

    if (existing.printfulId !== undefined) {
      const managedFieldChanged =
        (normalizedUpdates.name !== undefined &&
          normalizedUpdates.name !== existing.name) ||
        (normalizedUpdates.slug !== undefined &&
          normalizedUpdates.slug !== existing.slug) ||
        (normalizedUpdates.description !== undefined &&
          normalizedUpdates.description !== existing.description) ||
        (normalizedUpdates.price !== undefined &&
          normalizedUpdates.price !== existing.price) ||
        (normalizedUpdates.images !== undefined &&
          JSON.stringify(normalizedUpdates.images) !==
            JSON.stringify(existing.images)) ||
        (normalizedUpdates.variants !== undefined &&
          JSON.stringify(normalizedUpdates.variants) !==
            JSON.stringify(existing.variants)) ||
        (normalizedUpdates.active !== undefined &&
          normalizedUpdates.active !== existing.active);
      if (managedFieldChanged) {
        throw new Error(
          "Name, slug, description, price, images, variants, and active status are managed by Printful for this product. Edit them in Printful and sync again.",
        );
      }
    }

    await ctx.db.patch(id, normalizedUpdates);
    return null;
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found.");
    }
    await ctx.db.patch(args.id, { active: false });
    return null;
  },
});

export const hardDeleteProduct = mutation({
  args: {
    id: v.id("products"),
    confirmation: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found.");
    }
    if (args.confirmation !== product.name) {
      throw new Error(
        `Type “${product.name}” exactly to confirm permanent deletion.`,
      );
    }

    const orders = await ctx.db
      .query("orders")
      .take(MAX_HARD_DELETE_ORDER_SCAN + 1);
    if (orders.length > MAX_HARD_DELETE_ORDER_SCAN) {
      throw new Error(
        "There are too many orders to verify deletion safely. Archive this product instead.",
      );
    }
    if (
      orders.some((order) =>
        order.items.some((item) => item.productId === args.id),
      )
    ) {
      throw new Error(
        "This product appears in order history and cannot be permanently deleted. Archive it instead.",
      );
    }

    const cartReference = await ctx.db
      .query("cartItems")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .first();
    if (cartReference) {
      throw new Error("This product is still in a cart. Archive it instead.");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// ---- Orders ----

export const listAllOrders = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("orders").order("desc").collect();
  },
});

export const getOrderDetail = query({
  args: { id: v.id("orders") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("orders"),
      _creationTime: v.number(),
      email: v.string(),
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
      items: v.array(
        v.object({
          productId: v.id("products"),
          variantId: v.number(),
          quantity: v.number(),
          price: v.number(),
          productName: v.string(),
          productImage: v.optional(v.string()),
          variantName: v.optional(v.string()),
          size: v.optional(v.string()),
          color: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.id);
    if (!order) {
      return null;
    }

    const items = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const variant = product?.variants.find(
          (candidate) => candidate.id === item.variantId,
        );
        return {
          ...item,
          productName: product?.name ?? "Unknown Product",
          ...(product?.images[0] ? { productImage: product.images[0] } : {}),
          ...(variant?.name ? { variantName: variant.name } : {}),
          ...(variant?.size ? { size: variant.size } : {}),
          ...(variant?.color ? { color: variant.color } : {}),
        };
      }),
    );

    const { userId, ...safeOrder } = order;
    return { ...safeOrder, items };
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

    const activeProducts = products.filter((p) => p.active).length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;

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
