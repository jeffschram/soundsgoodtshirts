import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Send the viewport to the top when navigating to a new page.
 *
 * react-router preserves scroll position across route changes, so clicking a
 * link from halfway down /shop lands you halfway down the product page.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Back/forward: leave it alone. The browser restores where the user was,
    // which is what they expect from those buttons.
    if (navigationType === "POP") return;

    // In-page anchors keep their target — and their smooth scroll.
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }

    // `instant` deliberately overrides `scroll-behavior: smooth` from
    // index.css. Without it every navigation visibly animates upward, which
    // reads as the new page scrolling itself.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // Keyed on pathname and hash only, NOT search: OrderDetailsPage carries a
    // ?token= param, and re-scrolling when a query string changes would jump
    // the page out from under the user.
  }, [pathname, hash, navigationType]);

  return null;
}
