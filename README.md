# Sounds Good T-Shirts E-commerce Site
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
This project is connected to the Convex deployment named [`quiet-porpoise-44`](https://dashboard.convex.dev/d/quiet-porpoise-44).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## Order totals: shipping and tax

The charge is `subtotal + shipping + tax`, and **all three are computed
server-side**. `orders.create` ignores any price or total the client sends and
reads prices from the `products` table; `stripe.createCheckoutSession` quotes
shipping from the saved address and lets Stripe price tax. The breakdown is
read back off the priced Stripe session and stored on the order
(`subtotal` / `shipping` / `tax` / `total`), so `/order/:id` and admin show
what was actually charged and it can be reconciled against Printful's invoice.

Convex environment variables (Dashboard → Settings → Environment Variables):

| Variable | Required | Effect |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | yes | Existing. Without it checkout throws. |
| `PRINTFUL_API_TOKEN` | recommended | Existing. Also used for live shipping rates. Without it, shipping falls back to a flat constant. |
| `STRIPE_AUTOMATIC_TAX` | **set to `true` to collect tax** | Off by default. See below. |
| `STRIPE_APPAREL_TAX_CODE` | optional | Stripe product tax code for clothing. Unset means Stripe uses the account default. |

### Tax is off until you turn it on

`STRIPE_AUTOMATIC_TAX` defaults to off **on purpose**. Setting
`automatic_tax[enabled]=true` on a Stripe account that doesn't have Stripe Tax
active makes session creation fail outright — that would take checkout down
entirely rather than just leaving tax uncollected. So:

1. Enable Stripe Tax in the Stripe dashboard and complete the registrations for
   the states you have nexus in.
2. Set `STRIPE_AUTOMATIC_TAX=true` in the Convex environment.
3. Place a test order to a taxable state and confirm tax appears.

Until step 2, orders are charged subtotal + shipping with `tax: 0`.

Consider also setting `STRIPE_APPAREL_TAX_CODE` to Stripe's clothing tax code.
Apparel is treated differently from general goods in several states — PA, NJ,
and MN exempt clothing outright — so the account-default "general goods" code
will over-collect there.

### Shipping rates

`printful.quoteShippingRate` calls Printful's `POST /shipping/rates` and takes
the cheapest option. On any failure — no token, API error, no usable rates — it
falls back to `FALLBACK_FLAT_SHIPPING_RATE_USD` in `convex/printful.ts` rather
than throwing, so a Printful outage degrades the quote instead of blocking
checkout.

**That fallback is a placeholder, not a rate.** If orders are consistently
landing on it, shipping is being mispriced. The quote returns a
`fallbackReason` — check that first.

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
