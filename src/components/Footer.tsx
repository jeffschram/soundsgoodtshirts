import { Link } from "react-router-dom";

const FOOTER_SECTIONS = [
  {
    heading: "Shop",
    links: [
      { to: "/shop", label: "All Products" },
      { to: "/cart", label: "Cart" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <h3 className="text-base font-bold tracking-tight">Sounds Good T-Shirts</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Simple t-shirts for simple people. Honest designs, quality shirts, no
            nonsense.
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.heading}>
            <h4 className="text-sm font-semibold">{section.heading}</h4>
            <nav className="mt-3 flex flex-col gap-2">
              {section.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}

        <div>
          <h4 className="text-sm font-semibold">Support</h4>
          <nav className="mt-3 flex flex-col gap-2">
            <a
              href="mailto:hello@soundsgoodtshirts.com"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Email Us
            </a>
          </nav>
        </div>
      </div>

      <div className="border-t py-6">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Sounds Good T-Shirts. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
