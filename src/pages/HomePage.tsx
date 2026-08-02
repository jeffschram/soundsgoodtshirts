import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ProductGrid from "../components/ProductGrid";
import { Link } from "react-router-dom";

export default function HomePage() {
  const featuredProducts = useQuery(api.products.list, { featured: true });

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Simple T-Shirts for Simple People</h1>
          <p>Honest designs. Quality shirts. No nonsense.</p>
          <Link to="/shop" className="cta-button">Shop Now</Link>
        </div>
      </section>

      <section className="featured-products">
        <div className="container">
          <h2>Featured Products</h2>
          {featuredProducts && featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <div className="loading">
              {featuredProducts === undefined ? "Loading products..." : "No featured products available."}
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature">
              <h3>Quality Materials</h3>
              <p>100% cotton shirts that feel good and last long.</p>
            </div>
            <div className="feature">
              <h3>Simple Designs</h3>
              <p>No complicated graphics. Just honest, straightforward text.</p>
            </div>
            <div className="feature">
              <h3>Fast Shipping</h3>
              <p>Your shirt ships within 2-3 business days.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
