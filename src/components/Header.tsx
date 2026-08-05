import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, ShoppingBag } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
  const [menuOpen, setMenuOpen] = useState(false);

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
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              {/* Only rendered below 900px, where .site-nav and
                  .header-text-link are hidden. */}
              <button
                type="button"
                className="mobile-menu"
                aria-label="Open menu"
              >
                <Menu size={20} strokeWidth={2.5} />
              </button>
            </SheetTrigger>

            <SheetContent side="left" aria-describedby={undefined}>
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold tracking-tight">
                  MENU
                </SheetTitle>
              </SheetHeader>

              <nav
                className="flex flex-col gap-1 p-4"
                aria-label="Mobile navigation"
              >
                {NAV_LINKS.map((link) => (
                  <SheetClose key={link.to} asChild>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        cn(
                          "rounded-md px-3 py-2 text-lg font-semibold tracking-tight transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/60",
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  </SheetClose>
                ))}

                <Separator className="my-3" />

                {/* These are header-text-link on desktop, also hidden below
                    900px — so without them here a phone user cannot sign in. */}
                {user?.isAdmin ? (
                  <SheetClose asChild>
                    <Link
                      to="/admin"
                      className="rounded-md px-3 py-2 text-base font-medium hover:bg-accent/60"
                    >
                      Admin
                    </Link>
                  </SheetClose>
                ) : null}
                <SheetClose asChild>
                  <Link
                    to={user ? "/my-account" : "/sign-in"}
                    className="rounded-md px-3 py-2 text-base font-medium hover:bg-accent/60"
                  >
                    {user ? "Account" : "Sign in"}
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
