import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import ProductGallery from "@/components/ProductGallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const product = useQuery(api.products.getBySlug, {
    slug: slug || "",
  });

  const { addToCart } = useCart();

  if (product === undefined) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (selectedVariant !== null) {
      addToCart(product._id, selectedVariant, quantity);
    }
  };

  const selectedVariantData = product.variants.find(
    (v) => v.id === selectedVariant,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery
          key={product._id}
          images={product.images}
          productName={product.name}
        />

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            ${(selectedVariantData?.price ?? product.price).toFixed(2)}
          </p>
          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <Separator className="my-6" />

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Size &amp; Color</h2>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <Button
                  key={variant.id}
                  size="sm"
                  variant={
                    selectedVariant === variant.id ? "default" : "outline"
                  }
                  disabled={!variant.available}
                  onClick={() => setSelectedVariant(variant.id)}
                  className={cn(!variant.available && "line-through")}
                >
                  {variant.size} - {variant.color}
                </Button>
              ))}
            </div>
            {product.variants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No variants available for this product.
              </p>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-24"
            />
          </div>

          <Button
            size="lg"
            className="mt-6 w-full sm:w-auto"
            onClick={handleAddToCart}
            disabled={selectedVariant === null}
          >
            {selectedVariant === null ? "Select a size to continue" : "Add to Cart"}
          </Button>

          <Separator className="my-6" />

          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Categories:</span>
              {product.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Tags:</span>
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
