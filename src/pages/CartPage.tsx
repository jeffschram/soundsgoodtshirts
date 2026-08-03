import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>
        <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-dashed py-20">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button asChild>
            <Link to="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>

      <div className="mt-8 space-y-4">
        {cartItems.map((item) => {
          const variant = item.product?.variants.find(
            (v: any) => v.id === item.variantId,
          );
          return (
            <Card key={item._id}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                  <img
                    src={item.product?.images[0]}
                    alt={item.product?.name}
                    className="size-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{item.product?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {variant?.size} - {variant?.color}
                  </p>
                  <p className="text-sm tabular-nums">
                    ${(variant?.price ?? 0).toFixed(2)}
                  </p>
                </div>

                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(
                      item._id,
                      Math.max(1, parseInt(e.target.value) || 1),
                    )
                  }
                  className="w-20"
                  aria-label={`Quantity for ${item.product?.name}`}
                />

                <div className="w-24 text-right font-medium tabular-nums">
                  ${((variant?.price || 0) * item.quantity).toFixed(2)}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item._id)}
                  aria-label={`Remove ${item.product?.name} from cart`}
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator className="my-8" />

      <div className="flex flex-col items-end gap-4">
        <p className="text-lg font-semibold tabular-nums">
          Subtotal: ${cartTotal.total.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">
          Shipping and tax are calculated at checkout.
        </p>
        <Button asChild size="lg">
          <Link to="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
