import { useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

/**
 * Main product image with a thumbnail strip.
 *
 * Callers should pass a `key` tied to the product (e.g. `key={product._id}`) so
 * the selected index resets when navigating between products.
 */
export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border bg-muted">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="size-8" />
          <span className="text-sm">No image available</span>
        </div>
      </div>
    );
  }

  // Guard against an index left over from a longer image array.
  const activeIndex = Math.min(selectedIndex, images.length - 1);

  const focusThumbnail = (index: number) => {
    setSelectedIndex(index);
    thumbnailRefs.current[index]?.focus();
  };

  const handleThumbnailKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusThumbnail((index + 1) % images.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusThumbnail((index - 1 + images.length) % images.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusThumbnail(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusThumbnail(images.length - 1);
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="overflow-hidden rounded-xl border bg-muted">
        <img
          src={images[activeIndex]}
          alt={
            images.length > 1
              ? `${productName} — image ${activeIndex + 1} of ${images.length}`
              : productName
          }
          className="aspect-square size-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div
          role="group"
          aria-label={`${productName} images`}
          className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1"
        >
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              ref={(el) => {
                thumbnailRefs.current[index] = el;
              }}
              type="button"
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(e) => handleThumbnailKeyDown(e, index)}
              aria-label={`Show ${productName} image ${index + 1} of ${images.length}`}
              aria-current={index === activeIndex}
              className={cn(
                "size-20 shrink-0 overflow-hidden rounded-md border bg-muted transition-all",
                "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                index === activeIndex
                  ? "border-primary ring-1 ring-primary"
                  : "hover:border-foreground/30",
              )}
            >
              <img
                src={image}
                alt=""
                aria-hidden="true"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
