import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Slide-out cart, opened automatically when something is added.
 *
 * Rendered once at the app root rather than per page, so the same drawer is
 * shared by the header button and by add-to-cart from anywhere.
 */
export function CartDrawer() {
  const {
    cartItems,
    cartTotal,
    updateQuantity,
    removeFromCart,
    cartOpen,
    setCartOpen,
  } = useCart();

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="gap-0 p-0"
      >
        <SheetHeader>
          <h2 className="text-3xl font-bold tracking-tight">YOUR CART</h2>
          <SheetDescription>
            {cartTotal.itemCount === 0
              ? "Nothing in here yet."
              : `${cartTotal.itemCount} item${cartTotal.itemCount === 1 ? "" : "s"}`}
          </SheetDescription>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <SheetClose asChild>
              <Button asChild>
                <Link to="/shop">Browse the shop</Link>
              </Button>
            </SheetClose>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-4">
              {cartItems.map((item) => {
                const variant = item.product?.variants.find(
                  (v: any) => v.id === item.variantId,
                );
                const image =
                  item.product?.customImageUrls?.[0] ??
                  item.product?.images?.[0];

                return (
                  <li key={item._id} className="flex gap-3">
                    <div className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {image ? (
                        <img
                          src={image}
                          alt={item.product?.name ?? ""}
                          className="size-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.product?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {variant
                          ? [variant.size, variant.color]
                              .filter(Boolean)
                              .join(" · ")
                          : ""}
                      </p>
                      <p className="mt-1 text-sm tabular-nums">
                        ${((variant?.price ?? 0) * item.quantity).toFixed(2)}
                      </p>

                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Decrease quantity of ${item.product?.name ?? "item"}`}
                          onClick={() =>
                            updateQuantity(item._id, item.quantity - 1)
                          }
                        >
                          <Minus />
                        </Button>
                        <span
                          className="w-8 text-center text-sm tabular-nums"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Increase quantity of ${item.product?.name ?? "item"}`}
                          onClick={() =>
                            updateQuantity(item._id, item.quantity + 1)
                          }
                        >
                          <Plus />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${item.product?.name ?? "item"} from cart`}
                          className="ml-auto"
                          onClick={() => removeFromCart(item._id)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {cartItems.length > 0 && (
          <SheetFooter>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">
                ${cartTotal.total.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Shipping and tax are calculated at checkout.
            </p>
            <SheetClose asChild>
              <Button asChild size="lg" className="w-full">
                <Link to="/checkout">Checkout</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button asChild variant="outline" className="w-full">
                <Link to="/cart">View full cart</Link>
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
