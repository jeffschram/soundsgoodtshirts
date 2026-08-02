import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Header() {
  const { cartTotal } = useCart();
  const user = useQuery(api.auth.loggedInUser);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          Sounds Good T-Shirts
        </Link>
        
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/shop" className="nav-link">Shop</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
        </nav>

        <div className="header-actions">
          {user ? (
            <Link to="/my-account" className="account-link">
              My Account
            </Link>
          ) : (
            <Link to="/sign-in" className="account-link">
              Sign In
            </Link>
          )}
          <Link to="/cart" className="cart-link">
            Cart ({cartTotal.itemCount})
          </Link>
        </div>
      </div>
    </header>
  );
}
