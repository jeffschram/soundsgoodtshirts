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
        <h2 className="text-xl font-semibold tracking-tight">
          Simple T-Shirts for (from) Simple People
        </h2>
        <p className="text-lg text-gray-700">
          Jeff and Jon showed up to rehearsal with the noble intention of
          improving as musicians. Instead, they got a little too high. At some
          point Jon suggested that shirts should just say random things people
          enjoy thinking about, like “I Love Spaghetti.” Jeff considered this
          carefully, nodded like a seasoned entrepreneur, and said, “Sounds
          good.”
        </p>
        <p className="text-lg text-gray-700">
          What followed was a highly unproductive rehearsal session. Their
          phones quickly filled with phrases like “Banana for Scale,” “I feel
          like Bob Vila,” and “People are Ants.” Each idea was subjected to a
          rigorous approval process: “Yeah… sounds good.”
        </p>
        <p className="text-lg text-gray-700">
          The band did not improve that day, but a business was born. Sounds
          Good T-Shirts now proudly continues the tradition Jeff and Jon
          started: taking extremely dumb ideas very seriously. Sounds good. 👂👍
        </p>
      </div>
    </div>
  );
}
