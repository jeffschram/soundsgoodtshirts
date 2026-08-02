import { Link } from "react-router-dom";
import { Doc } from "../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";

interface ProductGridProps {
  products: Doc<"products">[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No products found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Link
          key={product._id}
          to={`/product/${product.slug}`}
          className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Card className="h-full overflow-hidden py-0 transition-shadow group-hover:shadow-md">
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={product.images[0]}
                alt={product.name}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium leading-tight">{product.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                ${product.price.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
