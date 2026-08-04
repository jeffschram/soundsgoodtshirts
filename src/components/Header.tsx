import { Link, NavLink } from "react-router-dom";
import { Menu, ShoppingBag } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "Our deal" },
  { to: "/contact", label: "Say hey" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn("site-nav__link", isActive && "site-nav__link--active");
}

export default function Header() {
  const { cartTotal, setCartOpen } = useCart();
  const user = useQuery(api.auth.loggedInUser);

  return (
    <>
      {/* <div className="announcement">FREE SHIPPING ON ORDERS OVER $60 <span>✦</span> LOOK GOOD, FEEL GOOD, SOUNDS GOOD</div> */}
      <header className="site-header">
        <Link
          to="/"
          className="wordmark"
          aria-label="Sounds Good T-Shirts home"
        >
          SOUNDS<span>GOOD!</span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {user?.isAdmin && (
            <Link to="/admin" className="header-text-link">
              Admin
            </Link>
          )}
          <Link
            to={user ? "/my-account" : "/sign-in"}
            className="header-text-link"
          >
            {user ? "Account" : "Sign in"}
          </Link>
          {/* Opens the drawer rather than navigating — /cart still exists
              and is reachable from inside it. */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="cart-link"
            aria-label={`Open cart, ${cartTotal.itemCount} item${cartTotal.itemCount === 1 ? "" : "s"}`}
          >
            <ShoppingBag size={20} strokeWidth={2.5} />
            <span>Bag</span>
            <b>{cartTotal.itemCount}</b>
          </button>
          <button className="mobile-menu" aria-label="Show menu">
            <Menu />
          </button>
        </div>
      </header>
    </>
  );
}
