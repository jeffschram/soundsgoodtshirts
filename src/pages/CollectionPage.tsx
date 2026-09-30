import { useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import CollectionHeading from "@/components/CollectionHeading";
import ProductGrid from "@/components/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();

  const collection = useQuery(api.collections.getBySlug, { slug: slug || "" });

  if (collection === undefined) {
    return (
      <section className="drop-section">
        <div className="section-heading">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-5 h-20 w-[min(560px,80vw)]" />
          </div>
        </div>
        <div className="product-grid product-grid--loading">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-none" />
          ))}
        </div>
      </section>
    );
  }

  // Unknown or archived slug. Archived reads as missing on purpose: a
  // collection the owner has switched off should not still be reachable by
  // anyone holding the old link.
  if (collection === null) {
    return (
      <section className="drop-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nothing here</p>
            <h2>
              No such
              <br />
              <em>collection.</em>
            </h2>
          </div>
        </div>
        <p className="empty-state">
          This collection has moved on. The shirts have not.
        </p>
        <div className="center-action">
          <Link to="/shop" className="pill-button pill-button--outline">
            See every shirt <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="drop-section">
      <CollectionHeading collection={collection} />

      {collection.products.length > 0 ? (
        <ProductGrid products={collection.products} />
      ) : (
        <p className="empty-state">
          Nothing in this collection yet. Check back soon.
        </p>
      )}

      <div className="center-action">
        <Link to="/shop" className="pill-button pill-button--outline">
          See every shirt <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}
