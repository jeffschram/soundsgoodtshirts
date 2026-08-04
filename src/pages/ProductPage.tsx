import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { ChevronDown } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Wearable order. Alphabetically "2XL" sorts before "S", which reads as broken
 * on a size picker. Unknown sizes fall to the end rather than being dropped.
 */
const SIZE_ORDER = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL",
  "One Size",
];

function sizeRank(size: string): number {
  const index = SIZE_ORDER.indexOf(size);
  return index === -1 ? SIZE_ORDER.length : index;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showGarmentInfo, setShowGarmentInfo] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // The route stays mounted when navigating between products, so a stale index
  // would show the previous product's image or overrun a shorter array.
  useEffect(() => {
    setImageIndex(0);
    setSelectedSize(null);
    setSelectedColor(null);
  }, [slug]);

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

  // Colours in the order Printful returned them; sizes in wearable order,
  // because alphabetically 2XL sorts before S.
  const colors = Array.from(new Set(product.variants.map((v) => v.color)));
  const sizes = Array.from(new Set(product.variants.map((v) => v.size))).sort(
    (a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b),
  );

  // A product with one colour has nothing to choose, so it is shown as a label
  // and selected implicitly.
  const onlyColor = colors.length === 1 ? colors[0] : null;
  const activeColor = onlyColor ?? selectedColor;

  const variantFor = (size: string, color: string | null) =>
    color === null
      ? undefined
      : product.variants.find((v) => v.size === size && v.color === color);

  // The two pickers have to know about each other: Printful products are often
  // sparse, so a size can exist in one colour and not another, and any
  // combination can be individually sold out.
  const isSizeSelectable = (size: string) =>
    activeColor
      ? (variantFor(size, activeColor)?.available ?? false)
      : product.variants.some((v) => v.size === size && v.available);

  const isColorSelectable = (color: string) =>
    selectedSize
      ? (variantFor(selectedSize, color)?.available ?? false)
      : product.variants.some((v) => v.color === color && v.available);

  const chooseColor = (color: string) => {
    setSelectedColor(color);
    // Drop a size that this colour does not stock, rather than leaving a
    // selection that maps to no variant.
    if (selectedSize && !variantFor(selectedSize, color)?.available) {
      setSelectedSize(null);
    }
  };

  const selectedVariantData =
    selectedSize && activeColor ? variantFor(selectedSize, activeColor) : undefined;

  const handleAddToCart = () => {
    if (selectedVariantData) {
      addToCart(product._id, selectedVariantData.id, quantity);
    }
  };

  // Hand-uploaded photography leads; the Printful mockups sit behind it. Both
  // are already resolved to URLs server-side.
  const images = [
    ...(product.customImageUrls ?? []),
    ...(product.images ?? []),
  ];
  // Clamp rather than trust state: the effect that resets the index runs after
  // render, so a shorter image array would briefly index out of bounds.
  const activeImage = Math.min(imageIndex, Math.max(0, images.length - 1));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-muted">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={
                  images.length > 1
                    ? `${product.name} (image ${activeImage + 1} of ${images.length})`
                    : product.name
                }
                className="aspect-square size-full object-cover"
              />
            ) : (
              <div className="flex aspect-square size-full items-center justify-center text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={index === activeImage}
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-md border transition",
                    "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    index === activeImage
                      ? "ring-2 ring-ring"
                      : "opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={image} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            ${(selectedVariantData?.price ?? product.price).toFixed(2)}
          </p>
          {product.description ? (
            <>
              <p className="mt-4 text-muted-foreground">
                {product.description}
              </p>
              {product.garmentDescription && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowGarmentInfo(!showGarmentInfo)}
                    aria-expanded={showGarmentInfo}
                    aria-controls="about-the-shirt"
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    About the shirt
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        showGarmentInfo && "rotate-180"
                      )}
                    />
                  </button>
                  {showGarmentInfo && (
                    <p
                      id="about-the-shirt"
                      className="mt-2 text-sm text-muted-foreground"
                    >
                      {product.garmentDescription}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            // No custom copy yet — show the garment info inline rather than
            // leaving the product looking blank.
            product.garmentDescription && (
              <p className="mt-4 text-muted-foreground">
                {product.garmentDescription}
              </p>
            )
          )}

          <Separator className="my-6" />

          <div className="space-y-3">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">
                Size
                {selectedSize ? (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {selectedSize}
                  </span>
                ) : null}
              </h2>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const selectable = isSizeSelectable(size);
                  return (
                    <Button
                      key={size}
                      size="sm"
                      variant={selectedSize === size ? "default" : "outline"}
                      disabled={!selectable}
                      aria-pressed={selectedSize === size}
                      onClick={() => setSelectedSize(size)}
                      className={cn("min-w-12", !selectable && "line-through")}
                    >
                      {size}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">
                Color
                {activeColor ? (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {activeColor}
                  </span>
                ) : null}
              </h2>
              {onlyColor ? (
                // Nothing to choose — show it as a fact, not a control.
                <Badge variant="secondary">{onlyColor}</Badge>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const selectable = isColorSelectable(color);
                    return (
                      <Button
                        key={color}
                        size="sm"
                        variant={selectedColor === color ? "default" : "outline"}
                        disabled={!selectable}
                        aria-pressed={selectedColor === color}
                        onClick={() => chooseColor(color)}
                        className={cn(!selectable && "line-through")}
                      >
                        {color}
                      </Button>
                    );
                  })}
                </div>
              )}
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
            disabled={!selectedVariantData}
          >
            {selectedVariantData
              ? "Add to Cart"
              : !selectedSize
                ? "Select a size to continue"
                : "Select a color to continue"}
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
