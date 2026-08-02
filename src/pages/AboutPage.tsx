import { Link } from "react-router-dom";

const SECTIONS: Array<{
  heading: string;
  body: string;
  links?: Array<{ to: string; label: string }>;
}> = [
  {
    heading: "Simple T-Shirts for Simple People",
    body: "We believe in honesty. Our t-shirts say exactly what they mean, nothing more, nothing less. No hidden meanings, no complicated graphics, just straightforward text on quality shirts.",
  },
  {
    heading: "Our Story",
    body: 'Started in 2024, Sounds Good T-Shirts was born from a simple idea: sometimes you just want to wear exactly how you feel. Whether that\'s "I like spaghetti" or simply "Yellow," we\'ve got you covered.',
  },
  {
    heading: "Quality Promise",
    body: "Every shirt is made from 100% cotton and printed with care. We work with trusted suppliers to ensure your shirt feels good and lasts long.",
  },
  {
    heading: "Shipping & Returns",
    body: "Every shirt is printed after you order it, so give it a few days to be made before it ships. If it arrives misprinted, damaged, or defective, we replace or refund it free within 30 days. Because each one is made to order, we can't take back a shirt that's exactly what you asked for - so check the size guide first.",
    links: [
      { to: "/shipping-policy", label: "Shipping Policy" },
      { to: "/returns-policy", label: "Returns Policy" },
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">
        About Sounds Good T-Shirts
      </h1>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight">
              {section.heading}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {section.body}
            </p>
            {section.links && (
              <div className="mt-3 flex flex-wrap gap-4">
                {section.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
