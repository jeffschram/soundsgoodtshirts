const SECTIONS = [
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
    body: "We ship within 2-3 business days. If you're not happy with your shirt, we offer easy returns within 30 days of purchase.",
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
          </section>
        ))}
      </div>
    </div>
  );
}
