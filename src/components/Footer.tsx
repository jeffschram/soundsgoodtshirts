import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Sounds Good T-Shirts</h3>
          <p>Simple t-shirts for simple people. Honest designs, quality shirts, no nonsense.</p>
        </div>
        <div className="footer-section">
          <h4>Shop</h4>
          <nav className="footer-nav">
            <Link to="/shop">All Products</Link>
            <Link to="/cart">Cart</Link>
          </nav>
        </div>
        <div className="footer-section">
          <h4>Company</h4>
          <nav className="footer-nav">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
        <div className="footer-section">
          <h4>Support</h4>
          <nav className="footer-nav">
            <a href="mailto:hello@soundsgoodtshirts.com">Email Us</a>
          </nav>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Sounds Good T-Shirts. All rights reserved.</p>
      </div>
    </footer>
  );
}
