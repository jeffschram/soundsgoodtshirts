import { useQuery } from "convex/react";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import ProductGrid, {
  EMPTY_STATE_CLASS,
  PRODUCT_GRID_CLASS,
} from "@/components/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";

const CONCEPTS = [
  { lineOne: "VERY", lineTwo: "AVAILABLE", color: "coral", tilt: "left" },
  { lineOne: "I SAW", lineTwo: "A DOG", color: "blue", tilt: "right" },
  { lineOne: "NO THANK", lineTwo: "YOU", color: "pink", tilt: "left" },
  { lineOne: "FINE,", lineTwo: "THANKS", color: "yellow", tilt: "right" },
];

const NOTES = [
  [
    "01",
    "SOFT STUFF",
    "Combed cotton with that already-favorite-shirt feeling.",
  ],
  [
    "02",
    "TINY WORDS",
    "Quiet little messages for people with loud inner monologues.",
  ],
  [
    "03",
    "MADE TO ORDER",
    "Printed when you want one, so less stuff sits around being stuff.",
  ],
];

export default function HomePage() {
  const products = useQuery(api.products.list, {});

  return (
    <div className="home-page">
      <section className="campaign-hero">
        <img
          src="/sounds-good-campaign.png"
          alt="Friends wearing black T-shirts against a bright yellow backdrop"
          className="campaign-hero__image"
        />
        <div className="campaign-hero__wash" />
        <div className="campaign-hero__copy">
          <p className="eyebrow">
            <Sparkles size={15} /> This is soundsgoodtshirts.com{" "}
            <Sparkles size={15} />
          </p>
          <h1>
            You can buy
            <br />
            <span>t-shirts here.</span>
          </h1>
          <div className="campaign-hero__actions">
            <Link to="/shop" className="pill-button pill-button--dark">
              Shop the shirts <ArrowUpRight size={18} />
            </Link>
            <p>
              Very soft. Extremely specific.
              <br />
              Zero explaining required.
            </p>
          </div>
        </div>
        <div className="hero-sticker" aria-hidden="true">
          <span>YEAH,</span>
          <strong>SOUNDS</strong>
          <strong>GOOD!</strong>
        </div>
        <a
          href="#new-drop"
          className="hero-scroll"
          aria-label="Scroll to the new drop"
        >
          Scroll for the good stuff <ArrowDownRight size={20} />
        </a>
      </section>

      <div className="ticker" aria-label="Store highlights">
        <div className="ticker__track">
          <span>SMALL WORDS, BIG FEELINGS ✦</span>
          <span>SOUNDS GOOD ✦</span>
          <span>SIMPLE T-SHIRTS FROM SIMPLE PEOPLE ✦</span>
          <span>SMALL WORDS, BIG FEELINGS ✦</span>
          <span>SOUNDS GOOD ✦</span>
          <span>SIMPLE T-SHIRTS FROM SIMPLE PEOPLE ✦</span>
        </div>
      </div>

      <section className="drop-section" id="new-drop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fresh from the brain</p>
            <h2>
              The spaghetti
              <br />
              <em>collection.</em>
            </h2>
          </div>
          <p className="section-heading__aside">
            Two deeply important positions.
            <br />
            Pick a side. Wear it everywhere.
          </p>
        </div>

        {products === undefined ? (
          <div className={PRODUCT_GRID_CLASS}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-none" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className={EMPTY_STATE_CLASS}>
            The shirts are backstage getting ready. Check back soon.
          </p>
        )}

        <div className="center-action">
          <Link to="/shop" className="pill-button pill-button--outline">
            See every shirt <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <section className="manifesto-section">
        <p className="manifesto-kicker">Our philosophy</p>
        <blockquote>
          “A T-shirt should feel like an old friend who says the{" "}
          <span>weird thing</span> you were thinking.”
        </blockquote>
        <div className="scribble" aria-hidden="true">
          ✓ yep
        </div>
      </section>

      <section className="concept-section">
        <div className="concept-section__intro">
          <p className="eyebrow">On the drawing board</p>
          <h2>
            More shirts.
            <br />
            Less restraint.
          </h2>
          <p>
            Future tiny statements currently being overthought in the studio.
          </p>
        </div>
        <div className="concept-grid">
          {CONCEPTS.map((concept) => (
            <article
              className={`concept-card concept-card--${concept.color}`}
              key={concept.lineOne}
            >
              <span className="concept-card__tag">CONCEPT / IN PROGRESS</span>
              <div
                className={`concept-tee concept-tee--${concept.tilt}`}
                aria-label={`${concept.lineOne} ${concept.lineTwo} T-shirt concept`}
              >
                <span>
                  {concept.lineOne}
                  <br />
                  {concept.lineTwo}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="notes-section">
        <div className="notes-section__title">
          <p className="eyebrow">The fine print, but big</p>
          <h2>
            Good shirts.
            <br />
            <em>No nonsense.</em>
          </h2>
        </div>
        <div className="notes-list">
          {NOTES.map(([number, title, body]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="last-call">
        <div>
          <p className="eyebrow">Your torso called</p>
          <h2>
            It wants
            <br />
            something <em>good.</em>
          </h2>
        </div>
        <Link
          to="/shop"
          className="round-button"
          aria-label="Shop all T-shirts"
        >
          Shop all <ArrowUpRight size={28} />
        </Link>
      </section>
    </div>
  );
}
