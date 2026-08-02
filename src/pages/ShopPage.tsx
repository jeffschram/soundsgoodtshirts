import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ProductGrid from "../components/ProductGrid";
import CategoryFilter from "../components/CategoryFilter";
import TagFilter from "../components/TagFilter";

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const products = useQuery(api.products.list, { 
    category: selectedCategory || undefined,
    tag: selectedTag || undefined
  });

  // Extract unique categories and tags from products
  const categories = products ? 
    Array.from(new Set(products.flatMap(p => p.categories))) : [];
  
  const tags = products ? 
    Array.from(new Set(products.flatMap(p => p.tags || []))) : [];

  return (
    <div className="shop-page">
      <div className="container">
        <h1>Shop All T-Shirts</h1>
        
        <div className="filters">
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

        {products ? (
          <ProductGrid products={products} />
        ) : (
          <div className="loading">Loading products...</div>
        )}
      </div>
    </div>
  );
}
