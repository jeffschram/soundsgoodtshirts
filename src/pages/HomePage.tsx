import { useQuery } from "convex/react";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import CollectionHeading from "@/components/CollectionHeading";
import ProductGrid from "@/components/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";

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

const GRID_SKELETON = (
  <div className="product-grid product-grid--loading">
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} className="aspect-square w-full rounded-none" />
    ))}
  </div>
);

export default function HomePage() {
  const sections = useQuery(api.collections.homepageSections, {});

  // Only the fallback needs every product, so the fetch is skipped entirely
  // while sections are loading and whenever there is at least one homepage
  // collection to render.
  const fallbackProducts = useQuery(
    api.products.list,
    sections === undefined || sections.length > 0 ? "skip" : {},
  );

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

      {/* The drop sections are whatever /admin/collections has flagged for the
          homepage. `#new-drop` stays on the first of them, because the hero's
          scroll link points at it. */}
      {sections === undefined ? (
        <section className="drop-section" id="new-drop">
          <div className="section-heading">
            <div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-5 h-20 w-[min(560px,80vw)]" />
            </div>
          </div>
          {GRID_SKELETON}
        </section>
      ) : sections.length > 0 ? (
        sections.map((collection, index) => (
          <section
            className="drop-section"
            id={index === 0 ? "new-drop" : undefined}
            key={collection._id}
          >
            <CollectionHeading collection={collection} />

            {collection.products.length > 0 ? (
              <ProductGrid products={collection.products} />
            ) : (
              <p className="empty-state">
                The shirts are backstage getting ready. Check back soon.
              </p>
            )}

            <div className="center-action">
              <Link
                to={`/collection/${collection.slug}`}
                className="pill-button pill-button--outline"
              >
                See the whole collection <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>
        ))
      ) : (
        // No homepage collections configured: lead with every shirt rather
        // than leaving a hole where the drop section was.
        <section className="drop-section" id="new-drop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fresh from the brain</p>
              <h2>
                Every shirt
                <br />
                <em>we make.</em>
              </h2>
            </div>
          </div>

          {fallbackProducts === undefined ? (
            GRID_SKELETON
          ) : fallbackProducts.length > 0 ? (
            <ProductGrid products={fallbackProducts} />
          ) : (
            <p className="empty-state">
              The shirts are backstage getting ready. Check back soon.
            </p>
          )}

          <div className="center-action">
            <Link to="/shop" className="pill-button pill-button--outline">
              See every shirt <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      )}

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
