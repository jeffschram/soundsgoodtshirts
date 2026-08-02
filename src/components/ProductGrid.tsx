import { Link } from "react-router-dom";
import { Doc } from "../../convex/_generated/dataModel";

interface ProductGridProps {
  products: Doc<"products">[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <Link key={product._id} to={`/product/${product.slug}`} className="product-card">
          <div className="product-image">
            <img src={product.images[0]} alt={product.name} />
          </div>
          <div className="product-info">
            <h3 className="product-name">{product.name}</h3>
            <p className="product-price">${product.price}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
