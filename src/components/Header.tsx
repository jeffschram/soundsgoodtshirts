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

/** Shared pill treatment for the desktop nav links and the text links. */
const HEADER_LINK =
  "rounded-full px-[13px] py-[10px] text-[13px] font-extrabold tracking-[0.035em] uppercase no-underline";

/** The Admin / Account links underline on hover rather than filling. */
const HEADER_TEXT_LINK = "hover:underline hover:decoration-2";

/** Cream pill with a hard offset shadow, shared by the cart and the burger. */
const PILL =
  "cursor-pointer border-2 border-ink bg-cream rounded-full shadow-[3px_3px_0_var(--ink)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_var(--ink)]";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    HEADER_LINK,
    "hover:bg-ink hover:text-yellow",
    isActive && "bg-ink text-yellow",
  );
}

export default function Header() {
  const { cartTotal, setCartOpen } = useCart();
  const user = useQuery(api.auth.loggedInUser);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* <div className="announcement">FREE SHIPPING ON ORDERS OVER $60 <span>✦</span> LOOK GOOD, FEEL GOOD, SOUNDS GOOD</div> */}
      <header
        className={cn(
          "sticky top-0 z-50 grid items-center",
          "h-[76px] phone-max:h-[66px]",
          // Three columns centre the nav independently of the logo width; below
          // 900px the nav is gone, so the third column would strand the actions.
          "grid-cols-[1fr_auto_1fr] nav-max:grid-cols-[1fr_auto]",
          "px-[clamp(18px,4vw,64px)] phone-max:px-[15px]",
          // Was color-mix(in srgb, var(--yellow) 94%, transparent), which is
          // just 94% alpha.
          "border-b-2 border-ink bg-yellow/94 backdrop-blur-[12px]",
        )}
      >
        <Link
          to="/"
          aria-label="Sounds Good T-Shirts home"
          className="w-max font-(family-name:--font-heading) text-[clamp(19px,2vw,27px)] leading-[0.8] tracking-[-0.025em] no-underline"
        >
          SOUNDS
          <span className="block origin-left rotate-[-3deg] text-coral">
            GOOD!
          </span>
        </Link>

        <nav
          className="flex items-center gap-1 nav-max:hidden"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-[5px]">
          {user?.isAdmin && (
            <Link
              to="/admin"
              className={cn(
                HEADER_LINK,
                HEADER_TEXT_LINK,
                "nav-max:hidden",
              )}
            >
              Admin
            </Link>
          )}
          <Link
            to={user ? "/my-account" : "/sign-in"}
            className={cn(HEADER_LINK, HEADER_TEXT_LINK, "nav-max:hidden")}
          >
            {user ? "Account" : "Sign in"}
          </Link>
          {/* Opens the drawer rather than navigating — /cart still exists
              and is reachable from inside it. */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart, ${cartTotal.itemCount} item${cartTotal.itemCount === 1 ? "" : "s"}`}
            className={cn(
              PILL,
              "inline-flex min-h-[42px] items-center gap-[7px]",
              "pr-[6px] pl-[14px] phone-max:pl-[10px]",
              "text-[13px] font-extrabold uppercase",
            )}
          >
            <ShoppingBag size={20} strokeWidth={2.5} />
            {/* Label drops on narrow phones so the pill does not crowd the
                wordmark; the count and icon still read as a cart. */}
            <span className="phone-max:hidden">Bag</span>
            <b className="grid h-[28px] min-w-[28px] place-items-center rounded-full bg-coral px-[6px] text-white">
              {cartTotal.itemCount}
            </b>
          </button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              {/* Only rendered below 900px, where .site-nav and
                  .header-text-link are hidden. */}
              <button
                type="button"
                aria-label="Open menu"
                className={cn(
                  PILL,
                  "hidden size-[42px] place-items-center p-0 text-ink",
                  "nav-max:grid",
                )}
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
