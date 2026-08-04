import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="footer-wordmark">
          SOUNDS
          <br />
          <span>GOOD!</span>
        </div>
        {/* <div className="footer-newsletter">
          <p>New shirts, old jokes, occasional emails.</p>
          <form onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="footer-email">Email address</label>
            <input id="footer-email" type="email" placeholder="your@email.com" />
            <button type="submit" aria-label="Join the email list"><ArrowUpRight /></button>
          </form>
        </div> */}
      </div>
      <div className="site-footer__bottom">
        <div className="footer-links">
          <Link to="/shop">Shop all</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/shipping-policy">Shipping</Link>
          <Link to="/returns-policy">Returns</Link>
        </div>
        <p>
          © {new Date().getFullYear()} Sounds Good T-Shirts.
          <br />
          Made for people with torsos.
        </p>
      </div>
    </footer>
  );
}
