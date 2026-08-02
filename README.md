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

## Store policies

Customer-facing policy pages live in `src/pages` and are routed in `src/App.tsx`:

| Page | Route | Status |
| --- | --- | --- |
| `ShippingPolicyPage.tsx` | `/shipping-policy` | Live, linked from the footer |
| `ReturnsPolicyPage.tsx` | `/returns-policy` | Live, linked from the footer |
| Privacy policy | `/privacy-policy` | **Not written yet** |
| Terms of service | `/terms` | **Not written yet** |

The shipping and returns copy describes how print-on-demand fulfillment
actually works — production time is separate from transit time, and returns
cover misprints/damage/defects but not change-of-mind or wrong-size orders,
because a made-to-order shirt can't be restocked. If fulfillment timelines or
the returns position change, update these pages rather than letting the site
promise something we can't honor. `src/pages/AboutPage.tsx` summarizes the same
position and links to both pages — keep it in sync.

**Privacy policy and terms of service are deliberately deferred, not forgotten.**
Stripe expects both before processing live payments, and a privacy policy is
required in several jurisdictions given the site collects names, emails, and
shipping addresses. They are the same shape of work as the two pages above.
Write them before taking real orders.

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
