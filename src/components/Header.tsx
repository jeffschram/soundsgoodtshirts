import { Link, NavLink } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:text-foreground",
  );
}

export default function Header() {
  const { cartTotal } = useCart();
  const user = useQuery(api.auth.loggedInUser);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="text-base font-bold tracking-tight sm:text-lg">
          Sounds Good T-Shirts
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={navLinkClass}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user?.isAdmin && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to={user ? "/my-account" : "/sign-in"}>
              {user ? "My Account" : "Sign In"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/cart">
              <ShoppingCart />
              <span className="hidden sm:inline">Cart</span>
              {cartTotal.itemCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 justify-center rounded-full px-1 tabular-nums">
                  {cartTotal.itemCount}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-1 border-t px-2 py-1.5 md:hidden">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={navLinkClass}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
