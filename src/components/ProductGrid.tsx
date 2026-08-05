import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Doc } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: Doc<"products">[];
}

/**
 * Shared with HomePage, which renders the same grid for its loading skeleton.
 * Top/left borders here plus right/bottom on each card draw the full rule lines
 * without doubling them between cells.
 */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 border-t-2 border-l-2 border-ink phone-max:grid-cols-1";

export const EMPTY_STATE_CLASS = "px-5 py-[72px] text-center font-extrabold";

/**
 * The card background cycles by position, not by any property of the product.
 *
 * Written as complete literal class strings rather than built from the index —
 * Tailwind scans source text, so `bg-${color}` compiles to nothing and the
 * backgrounds would silently vanish in a production build while working in dev.
 */
const MEDIA_BG = ["bg-pink", "bg-blue", "bg-coral", "bg-yellow"];

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0)
    return <p className={EMPTY_STATE_CLASS}>No products found.</p>;

  return (
    <div className={PRODUCT_GRID_CLASS}>
      {products.map((product, index) => (
        <Link
          key={product._id}
          to={`/product/${product.slug}`}
          className="group min-w-0 border-r-2 border-b-2 border-ink text-ink no-underline"
        >
          <div
            className={cn(
              "relative aspect-[1.1] overflow-hidden phone-max:aspect-square",
              MEDIA_BG[index % MEDIA_BG.length],
            )}
          >
            <span className="absolute top-4 left-4 z-[2] border-2 border-ink bg-yellow px-[10px] py-[7px] text-[9px] font-black tracking-[0.08em]">
              {index === 0 ? "BRAIN FAVORITE" : "NEW DROP"}
            </span>
            <img
              src={product.customImageUrls?.[0] ?? product.images[0]}
              alt={product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.045] group-hover:rotate-[-1deg]"
            />
            <span className="absolute right-[18px] bottom-[18px] grid size-[46px] place-items-center rounded-full border-2 border-ink bg-cream transition-transform duration-200 ease-in-out group-hover:rotate-45">
              <ArrowUpRight size={20} />
            </span>
          </div>
          <div className="flex min-h-[120px] justify-between gap-[22px] bg-cream p-[22px] phone-max:min-h-[104px]">
            <div>
              {/* Impact alone, matching the original — see the footer PR note. */}
              <h3 className="mt-0 mb-2 font-[Impact,sans-serif] text-[clamp(24px,3vw,42px)] leading-none uppercase">
                {product.name}
              </h3>
              <p className="m-0 max-w-[370px] text-xs text-[#55524a]">
                {product.description ||
                  "A very good shirt for a very specific mood."}
              </p>
            </div>
            <strong className="font-(family-name:--font-serif) text-[18px] whitespace-nowrap italic">
              ${product.price.toFixed(2)}
            </strong>
          </div>
        </Link>
      ))}
    </div>
  );
}
