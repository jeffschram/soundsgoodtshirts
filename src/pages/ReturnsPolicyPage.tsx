import { Link } from "react-router-dom";

const LAST_UPDATED = "August 2, 2026";

const SECTIONS: Array<{
  heading: string;
  body: string;
  bullets?: string[];
}> = [
  {
    heading: "The Short Version",
    body: "If we got it wrong, we fix it for free. If the shirt is exactly what you ordered and you've changed your mind, we can't take it back. Here's why, and here's exactly what is and isn't covered.",
  },
  {
    heading: "Why We Can't Do Free Returns",
    body: "Every shirt is printed after you order it. There's no shelf it came off and no shelf it can go back to - a returned shirt with your size and design on it can't be resold to anyone else. Stores that offer no-questions-asked returns are absorbing that in their prices. We'd rather keep the prices honest and be upfront about the tradeoff.",
  },
  {
    heading: "What We Replace Or Refund, No Charge",
    body: "If any of the following happens, it's on us and you don't pay a cent:",
    bullets: [
      "The print is wrong - misprinted, off-center, wrong design, or wrong color.",
      "The item is defective - bad stitching, holes, or a manufacturing fault.",
      "The item arrived damaged.",
      "You received the wrong item or the wrong size relative to what you ordered.",
    ],
  },
  {
    heading: "What We Can't Accept",
    body: "These aren't covered, and we'd rather tell you now than after you've shipped a package back:",
    bullets: [
      "Change of mind, or the design not being what you pictured.",
      "Ordering the wrong size. Please check the size guide on the product page before you buy - this is the single most common issue and we genuinely can't cover it.",
      "Normal wear, or damage from washing against the care instructions.",
      "Claims made more than 30 days after delivery.",
    ],
  },
  {
    heading: "How To Make A Claim",
    body: "Contact us within 30 days of your order arriving. Include your order number and a clear photo of the problem - for a misprint, a photo of the whole shirt laid flat works best. Once we've seen it, we'll send a replacement or refund you, whichever you prefer. In most cases you won't need to ship anything back to us.",
  },
  {
    heading: "Cancelling Or Changing An Order",
    body: "Because printing starts quickly, there's only a short window to change or cancel an order. Contact us as soon as possible - if it hasn't gone into production yet we can usually still stop it. Once it's printed, we can't.",
  },
  {
    heading: "Lost Packages",
    body: "A package that never arrives isn't a return, but we'll still make it right. Claims for packages lost in transit need to be filed within 30 days of the estimated delivery date.",
  },
  {
    heading: "Refunds",
    body: "Approved refunds go back to the original payment method. Depending on your bank or card issuer it can take a few business days to show up after we issue it.",
  },
];

export default function ReturnsPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Returns Policy</h1>
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
            Start A Claim
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            <Link
              to="/contact"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Contact us
            </Link>{" "}
            with your order number and a photo of the issue. If you're wondering
            where your order is rather than what's wrong with it, our{" "}
            <Link
              to="/shipping-policy"
              className="font-medium text-foreground underline underline-offset-4"
            >
              shipping policy
            </Link>{" "}
            covers expected timelines.
          </p>
        </section>
      </div>
    </div>
  );
}
