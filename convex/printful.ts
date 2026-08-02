import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const PRINTFUL_API_URL = "https://api.printful.com";

async function printfulFetch(path: string, token: string) {
  const response = await fetch(`${PRINTFUL_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const syncProducts = action({
  args: {},
  handler: async (ctx) => {
    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) {
      throw new Error("PRINTFUL_API_TOKEN environment variable is not set. Add it in the Convex dashboard.");
    }

    // Fetch all sync products from Printful store
    const listResponse = await printfulFetch("/sync/products?limit=100", token);
    const syncProducts = listResponse.result;

    let synced = 0;

    for (const syncProduct of syncProducts) {
      // Fetch full product details including variants
      const detailResponse = await printfulFetch(
        `/sync/products/${syncProduct.id}`,
        token
      );

      const { sync_product, sync_variants } = detailResponse.result;

      const variants = sync_variants.map((sv: any, index: number) => ({
        id: sv.id,
        name: sv.name,
        size: sv.product?.variant?.size || sv.sku || "One Size",
        color: sv.product?.variant?.color || "Default",
        price: parseFloat(sv.retail_price) || 0,
        available: sv.availability_status !== "discontinued",
      }));

      const images: string[] = [];
      if (sync_product.thumbnail_url) {
        images.push(sync_product.thumbnail_url);
      }
      // Also pull preview images from variant files
      for (const sv of sync_variants) {
        if (sv.files) {
          for (const file of sv.files) {
            if (file.type === "preview" && file.preview_url && !images.includes(file.preview_url)) {
              images.push(file.preview_url);
            }
          }
        }
      }

      const basePrice = variants.length > 0
        ? Math.min(...variants.map((v: any) => v.price))
        : 0;

      const productData = {
        printfulId: sync_product.id,
        slug: slugify(sync_product.name),
        name: sync_product.name,
        description: sync_product.name,
        price: basePrice,
        images: images.length > 0 ? images : ["/placeholder.png"],
        categories: ["t-shirts"],
        tags: [] as string[],
        featured: false,
        variants,
        active: true,
      };

      await ctx.runMutation(internal.printful.upsertProduct, productData);
      synced++;
    }

    return { synced };
  },
});

export const upsertProduct = internalMutation({
  args: {
    printfulId: v.number(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    images: v.array(v.string()),
    categories: v.array(v.string()),
    tags: v.array(v.string()),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_printful_id", (q) => q.eq("printfulId", args.printfulId))
      .unique();

    if (existing) {
      const { printfulId, ...updates } = args;
      // Preserve manually set fields
      await ctx.db.patch(existing._id, {
        ...updates,
        featured: existing.featured,
        categories: existing.categories.length > 0 ? existing.categories : updates.categories,
        tags: (existing.tags && existing.tags.length > 0) ? existing.tags : updates.tags,
      });
    } else {
      await ctx.db.insert("products", args);
    }
  },
});
