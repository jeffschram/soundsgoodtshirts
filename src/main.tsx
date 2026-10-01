import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// The boundary sits inside ConvexAuthProvider so the provider outlives a crash
// in the app below it. This is the last-resort net: anything reaching it got
// past a section-level boundary, but a styled apology beats the white screen
// the store served on 2026-09-30.
createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <ErrorBoundary label="app root">
      <App />
    </ErrorBoundary>
  </ConvexAuthProvider>,
);
