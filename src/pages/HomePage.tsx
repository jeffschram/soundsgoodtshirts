import { useQuery } from "convex/react";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import ProductGrid from "@/components/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Shared across every section of this page. Defined here rather than in CSS so
   the section chunks can keep using them as the migration continues. */
const EYEBROW =
  "m-0 mb-5 flex items-center gap-2 text-xs font-black tracking-[0.13em] uppercase";

/** Base treatment for the hero h1 and every section h2; sizes stay per-section. */
const DISPLAY_HEADING =
  "m-0 font-(family-name:--font-heading) font-black tracking-[-0.045em] uppercase leading-[0.82]";

const PILL_BUTTON =
  "inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full border-2 border-ink px-6 text-[13px] font-black tracking-[0.04em] uppercase no-underline transition-all duration-200 ease-[ease] hover:rotate-[-2deg] hover:scale-[1.03]";
const PILL_DARK = "bg-ink text-cream shadow-[4px_4px_0_var(--coral)]";
const PILL_OUTLINE = "bg-transparent shadow-[4px_4px_0_var(--ink)]";

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
      <section className="relative min-h-[min(790px,calc(100vh-104px))] overflow-hidden border-b-2 border-ink bg-yellow nav-max:min-h-[710px] phone-max:min-h-[680px]">
        <img
          src="/sounds-good-campaign.png"
          alt="Friends wearing black T-shirts against a bright yellow backdrop"
          className="absolute inset-0 size-full object-cover object-center nav-max:object-[64%_center] phone-max:object-[61%_50%]"
        />
        {/* The wash re-angles on phones so the copy stays legible over the
            photo: horizontal on desktop, vertical below 640. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,230,0,0.8)_0%,rgba(247,230,0,0.25)_40%,transparent_66%)] nav-max:bg-[linear-gradient(90deg,rgba(247,230,0,0.78),rgba(247,230,0,0.12)_72%)] phone-max:bg-[linear-gradient(180deg,rgba(247,230,0,0.87)_0%,rgba(247,230,0,0.26)_60%,transparent_100%)]" />
        <div className="relative z-[2] w-[min(780px,84vw)] pt-[clamp(76px,10vw,145px)] pr-0 pb-[90px] pl-[clamp(22px,6vw,92px)] phone-max:w-full phone-max:px-[18px] phone-max:pt-[55px] phone-max:pb-0">
          <p className={EYEBROW}>
            <Sparkles size={15} /> This is soundsgoodtshirts.com{" "}
            <Sparkles size={15} />
          </p>
          {/* The /[0.82] modifiers are load-bearing: tailwind-merge treats
              text-[size] as owning line-height, so a bare text- class silently
              drops DISPLAY_HEADING's leading-[0.82] and the h1 renders at 1.5. */}
          <h1
            className={cn(
              DISPLAY_HEADING,
              "text-[clamp(70px,10.8vw,172px)]/[0.82] phone-max:text-[clamp(62px,20vw,92px)]/[0.82]",
            )}
          >
            You can buy
            <br />
            <span className="text-coral [-webkit-text-stroke:2px_var(--ink)] [text-shadow:5px_5px_0_var(--ink)] phone-max:[-webkit-text-stroke-width:1px] phone-max:[text-shadow:3px_3px_0_var(--ink)]">
              t-shirts here.
            </span>
          </h1>
          <div className="mt-11 flex items-center gap-7 phone-max:mt-7 phone-max:flex-col phone-max:items-start phone-max:gap-[18px]">
            <Link to="/shop" className={cn(PILL_BUTTON, PILL_DARK)}>
              Shop the shirts <ArrowUpRight size={18} />
            </Link>
            <p className="m-0 text-[13px] leading-[1.5] font-bold">
              Very soft. Extremely specific.
              <br />
              Zero explaining required.
            </p>
          </div>
        </div>
        <div
          className="absolute right-[clamp(25px,5vw,80px)] bottom-[60px] z-[2] flex aspect-square w-[clamp(124px,13vw,190px)] rotate-[8deg] flex-col items-center justify-center rounded-[48%_52%_42%_58%/55%_45%_55%_45%] border-[3px] border-ink bg-pink p-4 text-center shadow-[7px_7px_0_var(--ink)] phone-max:right-[22px] phone-max:bottom-[42px]"
          aria-hidden="true"
        >
          <span className="text-[9px] font-black tracking-[0.08em]">YEAH,</span>
          <strong className="font-(family-name:--font-heading) text-[clamp(24px,2.7vw,42px)] leading-[0.9]">
            SOUNDS
          </strong>
          <strong className="font-(family-name:--font-heading) text-[clamp(24px,2.7vw,42px)] leading-[0.9]">
            GOOD!
          </strong>
        </div>
        <a
          href="#new-drop"
          className="absolute bottom-6 left-[clamp(22px,6vw,92px)] z-[2] flex items-center gap-2 text-[11px] font-black uppercase no-underline phone-max:hidden"
          aria-label="Scroll to the new drop"
        >
          Scroll for the good stuff <ArrowDownRight size={20} />
        </a>
      </section>

      <div
        className="overflow-hidden border-b-2 border-ink bg-blue py-[13px] text-white"
        aria-label="Store highlights"
      >
        <div className="flex w-max animate-ticker gap-[34px] font-(family-name:--font-heading) text-[18px] tracking-[0.04em] motion-reduce:animate-none">
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
            <p className={EYEBROW}>Fresh from the brain</p>
            <h2 className={DISPLAY_HEADING}>
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
          <div className="product-grid product-grid--loading">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-none" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="empty-state">
            The shirts are backstage getting ready. Check back soon.
          </p>
        )}

        <div className="center-action">
          <Link to="/shop" className={cn(PILL_BUTTON, PILL_OUTLINE)}>
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
          <p className={EYEBROW}>On the drawing board</p>
          <h2 className={DISPLAY_HEADING}>
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
          <p className={EYEBROW}>The fine print, but big</p>
          <h2 className={DISPLAY_HEADING}>
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
          <p className={EYEBROW}>Your torso called</p>
          <h2 className={DISPLAY_HEADING}>
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
