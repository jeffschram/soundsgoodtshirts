import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../context/CartContext";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const product = useQuery(api.products.getBySlug, {
    slug: slug || "",
  });

  const { addToCart } = useCart();

  if (product === undefined) {
    return <div className="loading">Loading product...</div>;
  }

  if (product === null) {
    return (
      <div className="product-page">
        <div className="container">
          <p>Product not found.</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (selectedVariant !== null) {
      addToCart(product._id, selectedVariant, quantity);
    }
  };

  const selectedVariantData = product.variants.find(v => v.id === selectedVariant);

  return (
    <div className="product-page">
      <div className="container">
        <div className="product-layout">
          <div className="product-images">
            <img src={product.images[0]} alt={product.name} />
          </div>

          <div className="product-details">
            <h1>{product.name}</h1>
            <p className="price">${selectedVariantData?.price || product.price}</p>
            <p className="description">{product.description}</p>

            <div className="variants">
              <h3>Size & Color</h3>
              <div className="variant-options">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    className={`variant-button ${selectedVariant === variant.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(variant.id)}
                    disabled={!variant.available}
                  >
                    {variant.size} - {variant.color}
                  </button>
                ))}
              </div>
            </div>

            <div className="quantity">
              <label htmlFor="quantity">Quantity:</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>

            <button
              className="add-to-cart-button"
              onClick={handleAddToCart}
              disabled={selectedVariant === null}
            >
              Add to Cart
            </button>

            <div className="product-meta">
              <div className="categories">
                <strong>Categories:</strong> {product.categories.join(", ")}
              </div>
              {product.tags && product.tags.length > 0 && (
                <div className="tags">
                  <strong>Tags:</strong> {product.tags.join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
