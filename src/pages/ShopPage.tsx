import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ProductGrid from "@/components/ProductGrid";
import CategoryFilter from "@/components/CategoryFilter";
import TagFilter from "@/components/TagFilter";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const products = useQuery(api.products.list, {
    category: selectedCategory || undefined,
    tag: selectedTag || undefined,
  });

  // Extract unique categories and tags from products
  const categories = products
    ? Array.from(new Set(products.flatMap((p) => p.categories)))
    : [];

  const tags = products
    ? Array.from(new Set(products.flatMap((p) => p.tags || [])))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Shop All T-Shirts</h1>

      <div className="mt-8 space-y-6">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <TagFilter
          tags={tags}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
        />
      </div>

      <Separator className="my-8" />

      {products ? (
        <ProductGrid products={products} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
