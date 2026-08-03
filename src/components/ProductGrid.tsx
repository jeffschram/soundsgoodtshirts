import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Doc } from "../../convex/_generated/dataModel";

interface ProductGridProps {
  products: Doc<"products">[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) return <p className="empty-state">No products found.</p>;

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <Link key={product._id} to={`/product/${product.slug}`} className={`product-card product-card--${index % 4}`}>
          <div className="product-card__media">
            <span className="product-card__badge">{index === 0 ? "BRAIN FAVORITE" : "NEW DROP"}</span>
            <img
              src={product.customImageUrls?.[0] ?? product.images[0]}
              alt={product.name}
              loading="lazy"
            />
            <span className="product-card__arrow"><ArrowUpRight size={20} /></span>
          </div>
          <div className="product-card__details">
            <div>
              <h3>{product.name}</h3>
              <p>{product.description || "A very good shirt for a very specific mood."}</p>
            </div>
            <strong>${product.price.toFixed(2)}</strong>
          </div>
        </Link>
      ))}
    </div>
  );
}
