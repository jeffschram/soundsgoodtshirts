import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = await request.text();

    if (stripeWebhookSecret) {
      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        return new Response("Missing stripe-signature header", { status: 400 });
      }
      // In production, verify the webhook signature here.
      // For now we proceed with basic validation.
    }

    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await ctx.runMutation(internal.stripe.fulfillOrder, {
        stripeSessionId: session.payment_intent || session.id,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
