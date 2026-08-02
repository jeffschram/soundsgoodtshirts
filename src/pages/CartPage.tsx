import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1>Your Cart</h1>
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="continue-shopping">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Your Cart</h1>
        
        <div className="cart-items">
          {cartItems.map((item) => {
            const variant = item.product?.variants.find((v: any) => v.id === item.variantId);
            return (
              <div key={item._id} className="cart-item">
                <div className="item-image">
                  <img src={item.product?.images[0]} alt={item.product?.name} />
                </div>
                
                <div className="item-details">
                  <h3>{item.product?.name}</h3>
                  <p>{variant?.size} - {variant?.color}</p>
                  <p className="price">${variant?.price}</p>
                </div>

                <div className="item-quantity">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item._id, parseInt(e.target.value))}
                  />
                </div>

                <div className="item-total">
                  ${((variant?.price || 0) * item.quantity).toFixed(2)}
                </div>

                <button
                  className="remove-button"
                  onClick={() => removeFromCart(item._id)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <div className="total">
            <strong>Total: ${cartTotal.total.toFixed(2)}</strong>
          </div>
          <Link to="/checkout" className="checkout-button">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
