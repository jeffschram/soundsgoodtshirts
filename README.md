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

## Creating the first admin user

`/admin` is gated on a `users.isAdmin` flag, and `convex/admin.ts:setUserAdmin`
calls `requireAdmin` before it will set that flag. On a brand new deployment
the `users` table is empty, so **no admin can be created through the app** —
you have to grant the first one out of band. Every subsequent admin can then be
promoted from Admin → Users in the UI.

Do this once per deployment (dev, and again on production):

1. **Sign up on the site** with the email that should be the admin. Use the
   password sign-up, not "continue as guest" — an anonymous account can't be
   made admin.
2. Open the [Convex dashboard](https://dashboard.convex.dev) and select the
   deployment you're bootstrapping. Double-check you're on production if that's
   the one you mean to change.
3. Go to **Functions** → `admin:bootstrapAdmin` → **Run function**.
4. Pass the email you signed up with:
   ```json
   { "email": "you@example.com" }
   ```
5. Run it. It returns the user id it promoted and a confirmation message.
6. Reload the site and go to `/admin`. You're in.

To confirm afterwards — or to check whether a deployment still needs a first
admin — run `admin:countAdmins` (no arguments); it returns the number of admins
and their emails. To revoke, run `bootstrapAdmin` again with
`{ "email": "you@example.com", "isAdmin": false }`.

### Why it works this way

`bootstrapAdmin` is an `internalMutation`. Internal functions are not part of
the public API — a browser, the React client, and a plain HTTP request all
cannot reach it. Running it requires access to the Convex dashboard for the
deployment, which is already the trust boundary.

We deliberately did **not** ship a public "make me admin if there are no admins
yet" mutation. That's a race the first visitor to a fresh deployment wins.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
