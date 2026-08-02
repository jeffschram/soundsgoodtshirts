import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import ProductGrid from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const FEATURES = [
  {
    title: "Quality Materials",
    body: "100% cotton shirts that feel good and last long.",
  },
  {
    title: "Simple Designs",
    body: "No complicated graphics. Just honest, straightforward text.",
  },
  {
    title: "Fast Shipping",
    body: "Your shirt ships within 2-3 business days.",
  },
];

export default function HomePage() {
  const featuredProducts = useQuery(api.products.list, { featured: true });

  return (
    <div>
      <section className="border-b bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple T-Shirts for Simple People
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Honest designs. Quality shirts. No nonsense.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/shop">Shop Now</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Featured Products</h2>
        <div className="mt-8">
          {featuredProducts === undefined ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No featured products available.
            </p>
          )}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
