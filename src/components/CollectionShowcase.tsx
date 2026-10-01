import type { Doc } from "../../convex/_generated/dataModel";
import CollectionHeading from "@/components/CollectionHeading";
import ProductGrid from "@/components/ProductGrid";

/**
 * A collection plus its member products, as `collections.homepageSections` and
 * `collections.getBySlug` both return it.
 */
type CollectionWithProducts = Doc<"collections"> & {
  products: Doc<"products">[];
};

/**
 * The body of a collection's drop section: its copy and its products.
 *
 * Shared by the homepage drop sections and /collection/:slug so the two can
 * never disagree about how a collection is laid out. The interesting case is a
 * collection with exactly ONE product: the product grid is two fixed columns,
 * so a lone card fills the left cell and leaves half the viewport empty with
 * the grid's top border running across the void. Those sections put the card
 * beside the copy instead — see `.collection-showcase` in src/index.css, which
 * stacks it back to copy-above-card at the shared 900px breakpoint.
 */
export default function CollectionShowcase({
  collection,
  emptyMessage,
}: {
  collection: CollectionWithProducts;
  emptyMessage: string;
}) {
  const products = collection.products;

  if (products.length === 0) {
    return (
      <>
        <CollectionHeading collection={collection} />
        <p className="empty-state">{emptyMessage}</p>
      </>
    );
  }

  // The heading stays ahead of the grid in the DOM in both branches, so it
  // introduces the product for screen readers and for the stacked layout. Only
  // the wide single-product layout swaps the two visually, via grid placement.
  if (products.length === 1) {
    return (
      <div className="collection-showcase">
        <CollectionHeading collection={collection} />
        <ProductGrid products={products} single />
      </div>
    );
  }

  return (
    <>
      <CollectionHeading collection={collection} />
      <ProductGrid products={products} />
    </>
  );
}
