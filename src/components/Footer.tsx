import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

/** Shared page gutter, matching the header's clamp. */
const PAGE_X = "px-[clamp(20px,6vw,90px)]";

const FOOTER_LINKS = [
  { to: "/shop", label: "Shop all" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/shipping-policy", label: "Shipping" },
  { to: "/returns-policy", label: "Returns" },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-cream">
      <div
        className={`grid grid-cols-[1.2fr_0.8fr] items-end gap-[70px] border-b border-b-[#4a4942] ${PAGE_X} py-[clamp(60px,8vw,120px)] phone-max:grid-cols-[1fr]`}
      >
        {/* Impact alone rather than var(--font-heading), preserving the
            original stack — see the PR note. */}
        <div className="font-[Impact,sans-serif] text-[clamp(80px,15vw,240px)] leading-[0.7] tracking-[-0.055em]">
          SOUNDS
          <br />
          <span className="text-yellow">GOOD!</span>
        </div>

        {/* Commented out, but converted with the rest so uncommenting it does
            not produce unstyled markup now that the CSS is gone. */}
        {/* <div>
          <p className="max-w-[390px] font-(family-name:--font-serif) text-[clamp(20px,2.4vw,32px)] italic">
            New shirts, old jokes, occasional emails.
          </p>
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex border-b-2 border-cream"
          >
            <label className="sr-only" htmlFor="footer-email">Email address</label>
            <input
              id="footer-email"
              type="email"
              placeholder="your@email.com"
              className="w-full border-0 bg-transparent py-4 text-cream outline-0"
            />
            <button
              type="submit"
              aria-label="Join the email list"
              className="cursor-pointer border-0 bg-transparent text-yellow"
            >
              <ArrowUpRight />
            </button>
          </form>
        </div> */}
      </div>

      <div
        className={`flex justify-between gap-10 ${PAGE_X} pt-8 pb-12 phone-max:flex-col phone-max:items-start`}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-[10px]">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs font-extrabold uppercase no-underline hover:text-yellow"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="m-0 text-right text-[11px] leading-[1.5] text-[#aaa79e] phone-max:text-left">
          © {new Date().getFullYear()} Sounds Good T-Shirts.
          <br />
          Made for people with torsos.
        </p>
      </div>
    </footer>
  );
}
