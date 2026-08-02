# Sounds Good T-Shirts

## Business Model

Novelty t-shirt business.

Current site: soundsgoodtshirts.com (Squarespace + backend fulfillment)
Products: Simple text-based designs ("I like spaghetti", "Yellow", "RED", etc.)
Price point: $35/shirt

Goal: replace the Squarespace store with a custom Vite/React + Convex + Printful build.

### Squarespace features to match or beat

- Grid layout with product categories
- Quick-view overlays
- Multi-image galleries
- Shopping cart
- Pages: Home/Shop, About, Contact, Cart, Product Details

## Tech Stack (as built)

| Layer       | Built with                                                         |
| ----------- | ------------------------------------------------------------------ |
| Frontend    | Vite + React 19 + TypeScript, react-router-dom v7. No Tailwind.    |
| Styling     | One global `src/index.css` (~1570 lines) of CSS custom properties. |
| Backend     | Convex — deployment `quiet-porpoise-44`                            |
| Fulfillment | Printful REST API                                                  |
| Payments    | Stripe Checkout via raw REST calls (no `stripe` npm package)       |
| Auth        | Convex Auth (`@convex-dev/auth`), Password + Anonymous providers   |

**Two open decisions where the build diverged from the original plan:**

## Status by Area

### Done

- **Home page** — hero, featured-product grid (`featured: true`), 3-up features section
- **Product catalog** — `ProductGrid`, `CategoryFilter`, `TagFilter`, detail pages, variant support (size/color, availability, per-variant price)
- **Slug URLs** — `/product/:slug` backed by `products.getBySlug` and a `by_slug` index
- **Shopping cart** — add/remove/quantity, persisted server-side in `cartItems` keyed by a `localStorage` session id; survives reloads
- **Admin at `/admin`** — `isAdmin` route guard redirecting non-admins to `/`; dashboard stats, product CRUD, order list + status changes, user list + admin toggle. Every `convex/admin.ts` function goes through `requireAdmin`.
- **Footer** — shop / company / support columns
- **Static pages** — About, Contact
- **Sample-product loading removed** — the seeding code and UI are gone _(the rows are not; see below)_
- **Convex schema** — `products`, `orders`, `cartItems`, `users` (+`isAdmin`), auth tables

### Partial

- **Printful** — `printful.syncProducts` pulls `/sync/products` and upserts by `printfulId`, preserving manually-set `featured` / `categories` / `tags`. `PRINTFUL_API_TOKEN` is set in the Convex dashboard. Nothing triggers the sync, and order submission does not exist.
- **Stripe** — Checkout Session created server-side and the browser redirects to Stripe; `/stripe-webhook` flips the order to `processing`. Signature verification is stubbed; totals are line-items only.

## Remaining Work

### 1. Catalog cutover — blocks everything downstream

- [ ] Delete the leftover demo product rows. `/shop` still serves "I like spaghetti", "Yellow", "RED" with `/api/placeholder/400/400` images — the seeding code was removed but the rows never were. Verified live on localhost:5173/shop.
- [ ] Add a "Sync from Printful" button to `/admin/products` — `syncProducts` exists but nothing calls it (no button, no cron)
- [ ] Sync real descriptions and categories — the action hardcodes `categories: ["t-shirts"]` and sets `description = name`
- [ ] Run the sync and confirm the real catalog renders

### 2. Order fulfillment — the largest missing piece

- [ ] Submit orders to Printful after successful payment. Nothing does this today; `stripe.fulfillOrder` only sets a status string.
- [ ] Handle Printful webhooks for order/shipment status updates
- [ ] Test a real order end to end through to a Printful shipment

### 3. Payments hardening

- [ ] Set and verify `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL` in the Convex dashboard
- [ ] Verify the Stripe webhook signature — `convex/router.ts:11` currently accepts any POST body
- [ ] Add shipping and tax to the order total
- [ ] Test a real payment

### 4. Security

- [ ] Lock down public mutations: `products.create`, `products.update`, `products.remove`, and `orders.updateStatus` are callable by anyone. The admin UI already uses the guarded `admin.*` equivalents, so these can likely be removed or made internal.
- [ ] Add an ownership check to `orders.get` — it returns any order by id
- [ ] Bootstrap path for the first admin. `admin.setUserAdmin` requires an existing admin, so the first `isAdmin: true` must be set by hand in the Convex dashboard — document the steps or add a one-time path.

### 5. Storefront polish

- [ ] Multi-image product gallery — `ProductPage` renders only `images[0]`, no thumbnails or carousel
- [ ] Policies pages (shipping, returns) — no page, no route, no footer link
- [ ] Merge the guest cart into the user's account on sign-in

### 6. Decisions to close

- [x] we are using ShadCN/UI for components/css
- [x] we are using Convex Auth

### 7. Launch

- [ ] Deploy to production
- [ ] Migrate the domain off Squarespace

### 8. For later version: V2

- [ ] Automated marketing and social media campaigns
- [ ] Create a pipeline to use an image generator to take the basic tshirt image and ai-generate funny images for the site and for marketing
- [ ] Create an admin area to automatically generate new shirts using just the text. Should be able to accept "I love spaghetti" and create the shirt on printful and the app automatically.
