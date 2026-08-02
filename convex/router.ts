import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { mapPrintfulStatus } from "./printful";

const http = httpRouter();

/** Stripe's replay window for webhook signatures, in seconds. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a Stripe `stripe-signature` header against the raw request body.
 *
 * Implemented by hand because this project deliberately avoids the `stripe`
 * npm package. Header format: `t=<timestamp>,v1=<hex>[,v1=<hex>...]`, signing
 * `<timestamp>.<raw body>` with HMAC-SHA256.
 */
async function verifyStripeSignature(
  body: string,
  header: string,
  secret: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return { ok: false, reason: "malformed signature header" };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: "malformed timestamp" };
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  // Sign the literal timestamp string, not the parsed number.
  const expected = await hmacSha256Hex(secret, `${timestamp}.${body}`);
  const matched = signatures.some((candidate) =>
    constantTimeEquals(candidate, expected)
  );

  return matched ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeWebhookSecret) {
      // Fail closed. Previously an unset secret meant every POST was trusted.
      console.error("STRIPE_WEBHOOK_SECRET is not set; rejecting webhook.");
      return new Response("Webhook not configured", { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const body = await request.text();
    const verification = await verifyStripeSignature(
      body,
      signature,
      stripeWebhookSecret
    );
    if (!verification.ok) {
      return new Response(`Invalid signature: ${verification.reason}`, {
        status: 400,
      });
    }

    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    if (typeof event?.id !== "string" || typeof event?.type !== "string") {
      return new Response("Malformed event", { status: 400 });
    }

    // Stripe retries deliveries; claim the event id before doing any work.
    const alreadyProcessed: boolean = await ctx.runMutation(
      internal.stripe.recordEventOnce,
      { eventId: event.id, type: event.type }
    );
    if (alreadyProcessed) {
      return new Response("OK (duplicate)", { status: 200 });
    }

    const object = event.data?.object ?? {};

    switch (event.type) {
      case "checkout.session.completed": {
        await ctx.runMutation(internal.stripe.applyPaymentStatus, {
          orderIdRaw: object.metadata?.orderId,
          stripeSessionId: object.id,
          stripePaymentIntentId: object.payment_intent ?? undefined,
          status: "processing",
        });
        break;
      }
      case "checkout.session.expired": {
        await ctx.runMutation(internal.stripe.applyPaymentStatus, {
          orderIdRaw: object.metadata?.orderId,
          stripeSessionId: object.id,
          status: "cancelled",
        });
        break;
      }
      case "payment_intent.payment_failed": {
        // A payment intent carries no orderId metadata, so this resolves
        // through the stored payment intent id.
        await ctx.runMutation(internal.stripe.applyPaymentStatus, {
          stripePaymentIntentId: object.id,
          status: "payment_failed",
        });
        break;
      }
      default:
        // Unhandled types are still recorded above, so they are acknowledged
        // and never reprocessed.
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

/**
 * Printful order and shipment updates.
 *
 * Printful webhooks carry no HMAC signature, so the endpoint is protected by a
 * shared secret in the query string: register the URL in the Printful dashboard
 * as `<site>/printful-webhook?secret=<PRINTFUL_WEBHOOK_SECRET>`. Without it this
 * would be an open endpoint that can move order state.
 */
http.route({
  path: "/printful-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error("PRINTFUL_WEBHOOK_SECRET is not set; rejecting webhook.");
      return new Response("Webhook not configured", { status: 500 });
    }

    const providedSecret =
      new URL(request.url).searchParams.get("secret") ?? "";
    if (!constantTimeEquals(providedSecret, expectedSecret)) {
      return new Response("Invalid secret", { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(await request.text());
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    const order = event?.data?.order;
    const printfulOrderId =
      typeof order?.id === "number" ? order.id : undefined;
    const externalId =
      typeof order?.external_id === "string" ? order.external_id : undefined;

    let status: string | undefined;
    let shipment: Record<string, unknown> | undefined;

    switch (event?.type) {
      case "package_shipped": {
        status = "shipped";
        const packageInfo = event.data?.shipment ?? {};
        shipment = {
          carrier: packageInfo.carrier ?? undefined,
          trackingNumber: packageInfo.tracking_number ?? undefined,
          trackingUrl: packageInfo.tracking_url ?? undefined,
          shippedAt: packageInfo.ship_date
            ? Date.parse(packageInfo.ship_date) || undefined
            : undefined,
        };
        break;
      }
      case "order_failed":
        status = "fulfillment_failed";
        break;
      case "order_canceled":
        status = "cancelled";
        break;
      case "order_updated":
        status = mapPrintfulStatus(order?.status ?? "") ?? undefined;
        break;
      default:
        // Unknown event type: acknowledge so Printful does not disable the
        // webhook, but change nothing.
        return new Response("OK (ignored)", { status: 200 });
    }

    if (!status && !shipment) {
      return new Response("OK (no change)", { status: 200 });
    }

    // A miss is acknowledged rather than thrown — a 5xx here would make
    // Printful retry and eventually disable the endpoint.
    await ctx.runMutation(internal.printful.applyPrintfulUpdate, {
      printfulOrderId,
      externalId,
      status,
      shipment: shipment as any,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;
