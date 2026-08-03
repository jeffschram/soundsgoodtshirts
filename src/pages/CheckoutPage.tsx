import { useEffect, useState } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import { SignInForm } from "@/SignInForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const user = useQuery(api.auth.loggedInUser);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || "",
    name: user?.name || "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const createOrder = useMutation(api.orders.create);
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const quoteShipping = useAction(api.printful.quoteShipping);

  // Display-only shipping estimate. The amount actually charged is quoted
  // again server-side in createCheckoutSession from the saved order.
  const [shippingEstimate, setShippingEstimate] = useState<number | null>(null);
  const [quotingShipping, setQuotingShipping] = useState(false);

  const { address1, city, state, zip, country } = formData;
  const addressComplete = Boolean(address1 && city && state && zip && country);

  // Printful's rate endpoint keys on the CATALOG variant id, not the sync
  // variant id we store as `variantId` and send when submitting orders.
  const shippingItems = cartItems.map((item) => ({
    printfulVariantId: item.product?.variants.find(
      (variant: any) => variant.id === item.variantId,
    )?.printfulVariantId,
    quantity: item.quantity,
  }));
  const shippingItemsKey = JSON.stringify(shippingItems);

  useEffect(() => {
    if (!addressComplete || cartItems.length === 0) {
      setShippingEstimate(null);
      return;
    }

    let cancelled = false;
    setQuotingShipping(true);

    // Debounced, so typing a ZIP doesn't fire a request per keystroke.
    const timer = setTimeout(() => {
      void quoteShipping({
        recipient: { address1, city, state, zip, country },
        items: JSON.parse(shippingItemsKey),
      })
        .then((quote) => {
          if (!cancelled) setShippingEstimate(quote.amount);
        })
        .catch(() => {
          // Estimate only — a failure here shouldn't block checkout, and the
          // real number is quoted server-side at payment.
          if (!cancelled) setShippingEstimate(null);
        })
        .finally(() => {
          if (!cancelled) setQuotingShipping(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    addressComplete,
    address1,
    city,
    state,
    zip,
    country,
    shippingItemsKey,
    cartItems.length,
    quoteShipping,
  ]);

  const estimatedTotal = cartTotal.total + (shippingEstimate ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Prices and the total are deliberately not sent — orders.create recomputes
    // them server-side from the products table.
    const orderItems = cartItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    try {
      const orderId = await createOrder({
        email: formData.email,
        items: orderItems,
        shippingAddress: {
          name: formData.name,
          address1: formData.address1,
          address2: formData.address2,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
        },
      });

      // Create Stripe checkout session and redirect
      const { url } = await createCheckout({ orderId });

      if (url) {
        // Deliberately NOT clearing the cart here. Two reasons: an in-flight
        // Convex mutation at navigation makes the client's beforeunload
        // handler fire Chrome's "Leave site?" dialog on the pay button, and a
        // customer who cancels or fails payment would come back to an empty
        // cart. The order page clears it once payment actually succeeded.
        window.location.href = url;
      } else {
        toast.error("Could not create payment session. Please try again.");
        setSubmitting(false);
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (error.message?.includes("STRIPE_SECRET_KEY")) {
        toast.error("Stripe is not configured yet. Payment is unavailable.");
      } else {
        toast.error("Error during checkout. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {!user && (
            <Card>
              <CardHeader>
                <CardTitle>Account (Optional)</CardTitle>
                <CardDescription>
                  Create an account to track your orders and save your
                  information for future purchases.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showAccountCreation ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAccountCreation(true)}
                    >
                      Create Account
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Or continue as guest
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SignInForm />
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowAccountCreation(false)}
                    >
                      Continue as Guest
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!user?.email}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address1">Address</Label>
                  <Input
                    id="address1"
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address2">
                    Apartment, suite, etc. (optional)
                  </Label>
                  <Input
                    id="address2"
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Continue to Payment"}
            </Button>
          </form>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item) => {
              const variant = item.product?.variants.find(
                (v: any) => v.id === item.variantId,
              );
              return (
                <div key={item._id} className="flex justify-between gap-4 text-sm">
                  <span className="min-w-0">
                    {item.product?.name}
                    <span className="block text-muted-foreground">
                      {variant?.size} - {variant?.color} &times; {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    ${((variant?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${cartTotal.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {!addressComplete
                    ? "Enter address"
                    : quotingShipping
                      ? "Calculating…"
                      : shippingEstimate !== null
                        ? `$${shippingEstimate.toFixed(2)}`
                        : "Calculated at payment"}
                </span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">Tax</span>
                <span>Calculated at payment</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold tabular-nums">
              <span>
                {shippingEstimate !== null ? "Estimated total" : "Subtotal"}
              </span>
              <span>${estimatedTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tax is calculated on the payment page, where you'll see the final
              amount before you're charged.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
