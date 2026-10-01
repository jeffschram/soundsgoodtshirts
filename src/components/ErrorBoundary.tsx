import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * Catch render errors so one broken thing stops being every broken thing.
 *
 * On 2026-09-30 a single `useQuery` pointed at a Convex function that had not
 * been deployed threw during render, React unmounted the whole tree, and the
 * store went white — hero, ticker, manifesto and all, none of which needed the
 * backend. There was nothing between the failing query and the root.
 *
 * This has to be a class component: `componentDidCatch` has no hook equivalent,
 * so function components cannot catch render errors at all.
 *
 * Use it in two places, and the nesting is the point:
 *   - once at the root, as the last-resort net, and
 *   - around each block that depends on the backend, so a backend failure costs
 *     that block instead of the page.
 */

type Props = {
  children: ReactNode;
  /** Shown instead of `children` after a throw. Defaults to a full-page notice. */
  fallback?: ReactNode;
  /** Identifies the boundary in the console, e.g. "HomePage drop sections". */
  label?: string;
};

type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Real failures have to stay debuggable in production — the fallback below
    // deliberately tells the customer nothing, so the console is the only
    // record of what actually broke.
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      errorInfo.componentStack,
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    // Customers get the store's voice, not a stack trace. Reload is a plain
    // anchor rather than a router link, because the root boundary sits outside
    // the Router and may be rendering precisely because the Router threw.
    return (
      <section className="drop-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Well, that's embarrassing</p>
            <h2>
              Something
              <br />
              <em>went sideways.</em>
            </h2>
          </div>
        </div>
        <p className="empty-state">
          The shirts are backstage getting ready. Give it another go in a
          moment.
        </p>
        <div className="center-action">
          <a href="/" className="pill-button pill-button--outline">
            Reload the shop
          </a>
        </div>
      </section>
    );
  }
}
