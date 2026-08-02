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

## Creating the first admin

`/admin` is gated on a user's `isAdmin` flag, and `admin.setUserAdmin` requires
an existing admin — so a fresh deployment has no way in. Bootstrap it:

1. Sign up through the app at `/sign-in` with the email you want to be admin.
2. Run, against that deployment:

   ```
   npx convex run admin:bootstrapAdmin '{"email":"you@example.com"}'
   ```

3. Reload `/admin`.

`bootstrapAdmin` is an `internalMutation`, so it is unreachable from any client
and only runs with deployment credentials. Once one admin exists, promote
others through `/admin/users`.

This must be repeated on the production deployment — the `users` table starts
empty there, and environment variables do not carry across deployments.

## Environment variables

Set in the Convex dashboard for each deployment:

| Variable | Purpose |
| --- | --- |
| `PRINTFUL_API_TOKEN` | Product sync and order submission |
| `PRINTFUL_WEBHOOK_SECRET` | Shared secret in the Printful webhook URL |
| `PRINTFUL_CONFIRM_ORDERS` | `"true"` submits real orders; anything else creates drafts |
| `STRIPE_SECRET_KEY` | Checkout session creation |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `SITE_URL` | Post-checkout redirect base, no trailing slash |

Register `<site>/printful-webhook?secret=<PRINTFUL_WEBHOOK_SECRET>` in the
Printful dashboard, and `<site>/stripe-webhook` in Stripe.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
