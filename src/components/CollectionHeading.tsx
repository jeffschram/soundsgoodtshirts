import { Fragment } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

/**
 * Render newlines in admin-entered copy as line breaks.
 *
 * The heading and aside are deliberately multi-line in the design ("The
 * spaghetti" / "collection."), and a textarea is the only place the owner can
 * express that. Rendered as breaks rather than interpreted as HTML, so admin
 * copy can never inject markup.
 */
function withLineBreaks(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

/**
 * The section heading for a collection, on the homepage and on its own page.
 *
 * Every copy field is optional — a collection created with nothing but a name
 * and slug still renders a correct heading.
 */
export default function CollectionHeading({
  collection,
}: {
  collection: Doc<"collections">;
}) {
  return (
    <div className="section-heading">
      {/* The eyebrow + h2 are one flex child so the aside can sit beside them.
          Classed, not bare, because the single-product layout gives this block
          a full-line flex-basis to push the aside underneath it instead. */}
      <div className="section-heading__copy">
        {collection.eyebrow ? (
          <p className="eyebrow">{collection.eyebrow}</p>
        ) : null}
        <h2>
          {withLineBreaks(collection.headingCopy || collection.name)}
          {collection.headingAccent ? (
            <>
              <br />
              <em>{collection.headingAccent}</em>
            </>
          ) : null}
        </h2>
      </div>
      {collection.aside ? (
        <p className="section-heading__aside">
          {withLineBreaks(collection.aside)}
        </p>
      ) : null}
    </div>
  );
}
