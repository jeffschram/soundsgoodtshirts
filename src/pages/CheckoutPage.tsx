import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "../SignInForm";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const orderItems = cartItems.map(item => {
      const variant = item.product?.variants.find((v: any) => v.id === item.variantId);
      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: variant?.price || 0,
      };
    });

    try {
      const orderId = await createOrder({
        email: formData.email,
        items: orderItems,
        total: cartTotal.total,
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
        clearCart();
        window.location.href = url;
      } else {
        alert("Could not create payment session. Please try again.");
        setSubmitting(false);
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (error.message?.includes("STRIPE_SECRET_KEY")) {
        alert("Stripe is not configured yet. Payment processing is unavailable.");
      } else {
        alert("Error during checkout. Please try again.");
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
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>

        <div className="checkout-layout">
          <div className="checkout-form">
            {!user && (
              <div className="account-section">
                <h2>Account (Optional)</h2>
                <p className="account-description">
                  Create an account to track your orders and save your information for future purchases.
                </p>

                {!showAccountCreation ? (
                  <div className="account-options">
                    <button
                      type="button"
                      className="create-account-button"
                      onClick={() => setShowAccountCreation(true)}
                    >
                      Create Account
                    </button>
                    <p className="guest-checkout">Or continue as guest</p>
                  </div>
                ) : (
                  <div className="account-creation">
                    <SignInForm />
                    <button
                      type="button"
                      className="cancel-account-button"
                      onClick={() => setShowAccountCreation(false)}
                    >
                      Continue as Guest
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h2>Contact Information</h2>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!user?.email}
                />
              </div>

              <div className="form-section">
                <h2>Shipping Address</h2>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <input
                  type="text"
                  name="address1"
                  placeholder="Address"
                  value={formData.address1}
                  onChange={handleInputChange}
                  required
                />
                <input
                  type="text"
                  name="address2"
                  placeholder="Apartment, suite, etc. (optional)"
                  value={formData.address2}
                  onChange={handleInputChange}
                />
                <div className="form-row">
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                  />
                  <input
                    type="text"
                    name="zip"
                    placeholder="ZIP Code"
                    value={formData.zip}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="place-order-button" disabled={submitting}>
                {submitting ? "Processing..." : `Pay $${cartTotal.total.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className="order-summary">
            <h2>Order Summary</h2>
            {cartItems.map((item) => {
              const variant = item.product?.variants.find((v: any) => v.id === item.variantId);
              return (
                <div key={item._id} className="summary-item">
                  <span>{item.product?.name} ({variant?.size} - {variant?.color})</span>
                  <span>x{item.quantity}</span>
                  <span>${((variant?.price || 0) * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
            <div className="summary-total">
              <strong>Total: ${cartTotal.total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
