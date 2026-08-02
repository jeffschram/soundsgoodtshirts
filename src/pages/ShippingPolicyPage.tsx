import { Link } from "react-router-dom";

const LAST_UPDATED = "August 2, 2026";

const SECTIONS: Array<{
  heading: string;
  body: string;
  bullets?: string[];
}> = [
  {
    heading: "Everything Is Made To Order",
    body: "We don't keep boxes of shirts in a garage. Every order is printed by our fulfillment partner after you place it, which means there are two separate clocks on your order: the time it takes to print and pack it, and the time it takes to ship to you.",
  },
  {
    heading: "Production Time",
    body: "Apparel is typically printed and packed within 2-5 business days of your order. Larger orders, and orders placed during holiday peaks, can take longer. You'll get a tracking email the moment your order leaves the facility - if you haven't seen one yet, it's still being printed.",
  },
  {
    heading: "Transit Time",
    body: "Transit time starts after production finishes, not when you place the order.",
    bullets: [
      "United States: usually 3-5 business days once shipped.",
      "Canada: usually 5-10 business days once shipped.",
      "Rest of world: usually 10-20 business days once shipped, and customs can add more.",
    ],
  },
  {
    heading: "So When Will It Actually Arrive?",
    body: "Add the two together. A typical US order lands roughly 5-10 business days after you place it. We'd rather give you an honest range than a number we can't hit.",
  },
  {
    heading: "Shipping Costs",
    body: "Shipping is calculated at checkout based on where your order is going and what's in it. You'll see the exact amount before you pay - nothing is added afterward.",
  },
  {
    heading: "Multiple Items, Multiple Packages",
    body: "Orders are printed at whichever facility is closest to you and set up for that product. If your order contains items made at different facilities, it may arrive in more than one package, on more than one day, at no extra cost to you.",
  },
  {
    heading: "International Orders, Customs, and Duties",
    body: "Import duties, taxes, and customs fees are set by your country and are not included in what you pay us. They're your responsibility, and they're collected by the carrier or customs office on delivery. We can't predict them or refund them.",
  },
  {
    heading: "Address Accuracy",
    body: "Please double-check your shipping address at checkout. If a package is returned to the facility because the address was wrong or incomplete, we'll reach out - but reshipping is at your cost, since the original shirt was already printed for you.",
  },
  {
    heading: "Lost or Delayed Packages",
    body: "If tracking has stalled or your package never showed up, get in touch and we'll chase it down. Claims for packages lost in transit need to be filed within 30 days of the estimated delivery date, so don't sit on it.",
  },
];

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Shipping Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight">
              {section.heading}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {section.body}
            </p>
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            Questions About An Order
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Something wrong with your order, or just want to know where it is?{" "}
            <Link
              to="/contact"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Get in touch
            </Link>{" "}
            with your order number and we'll sort it out. See our{" "}
            <Link
              to="/returns-policy"
              className="font-medium text-foreground underline underline-offset-4"
            >
              returns policy
            </Link>{" "}
            if your shirt arrived damaged or misprinted.
          </p>
        </section>
      </div>
    </div>
  );
}
