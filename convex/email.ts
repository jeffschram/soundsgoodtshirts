import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * `orders@` is send-only — no mailbox exists behind it. Replies go to the
 * inbox that is actually read. Both are constants so changing them is one line.
 */
const FROM_ADDRESS = "Sounds Good T-Shirts <orders@soundsgoodtshirts.com>";
const REPLY_TO_ADDRESS = "schramindustries@gmail.com";

const MAX_EMAIL_ATTEMPTS = 3;

function money(amount: number | undefined): string {
  return `$${(amount ?? 0).toFixed(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in the Convex dashboard.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      reply_to: REPLY_TO_ADDRESS,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    // Resend puts the reason in the body; the status alone is not debuggable.
    const body = await response.text().catch(() => "");
    throw new Error(`Resend ${response.status}: ${body.slice(0, 300)}`);
  }
}

export const getOrderForEmail = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const items = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const variant = product?.variants.find((v) => v.id === item.variantId);
        return {
          name: product?.name ?? "Item",
          variant: variant ? `${variant.size} / ${variant.color}` : "",
          quantity: item.quantity,
          price: item.price,
        };
      })
    );

    return { order, items };
  },
});

export const markEmailSent = internalMutation({
  args: {
    orderId: v.id("orders"),
    field: v.union(
      v.literal("confirmationEmailSentAt"),
      v.literal("shipmentEmailSentAt")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { [args.field]: Date.now() });
  },
});

function layout(heading: string, intro: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<h1 style="margin:0 0 12px;font-size:20px">${heading}</h1>
<p style="margin:0 0 20px;color:#555;line-height:1.5">${intro}</p>
${body}
<p style="margin:24px 0 0;font-size:12px;color:#888">Reply to this email if anything looks wrong.</p>
</div></body></html>`;
}

function itemsTable(
  items: Array<{ name: string; variant: string; quantity: number; price: number }>
): string {
  const rows = items
    .map(
      (item) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee">
  <strong>${escapeHtml(item.name)}</strong>
  ${item.variant ? `<br><span style="color:#777;font-size:13px">${escapeHtml(item.variant)}</span>` : ""}
  <br><span style="color:#777;font-size:13px">Qty ${item.quantity}</span>
</td>
<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top">${money(item.price * item.quantity)}</td>
</tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`;
}

/**
 * Order confirmation, sent once payment is confirmed.
 *
 * Scheduled from stripe.applyPaymentStatus. Guarded on confirmationEmailSentAt
 * so a redelivered Stripe event cannot email the customer twice, and retried on
 * transient failures the same way Printful submission is.
 */
export const sendOrderConfirmation = internalAction({
  args: { orderId: v.id("orders"), attempt: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const attempt = args.attempt ?? 0;

    const data = await ctx.runQuery(internal.email.getOrderForEmail, {
      orderId: args.orderId,
    });
    if (!data) return;

    const { order, items } = data;
    if (order.confirmationEmailSentAt !== undefined) return;

    const siteUrl = process.env.SITE_URL ?? "";
    const orderUrl = order.accessToken
      ? `${siteUrl}/order/${order._id}?token=${order.accessToken}`
      : `${siteUrl}/order/${order._id}`;

    const totals = `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
<tr><td style="padding:4px 0;color:#555">Subtotal</td><td style="padding:4px 0;text-align:right">${money(order.subtotal)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Shipping</td><td style="padding:4px 0;text-align:right">${money(order.shipping)}</td></tr>
${order.tax ? `<tr><td style="padding:4px 0;color:#555">Tax</td><td style="padding:4px 0;text-align:right">${money(order.tax)}</td></tr>` : ""}
<tr><td style="padding:8px 0 0;font-weight:600">Total</td><td style="padding:8px 0 0;text-align:right;font-weight:600">${money(order.total)}</td></tr>
</table>`;

    const address = order.shippingAddress;
    const addressBlock = `<p style="margin:20px 0 0;font-size:13px;color:#555;line-height:1.5">
<strong style="color:#111">Shipping to</strong><br>
${escapeHtml(address.name)}<br>
${escapeHtml(address.address1)}${address.address2 ? `<br>${escapeHtml(address.address2)}` : ""}<br>
${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.zip)}<br>
${escapeHtml(address.country)}
</p>`;

    const cta = siteUrl
      ? `<p style="margin:24px 0 0"><a href="${orderUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">View your order</a></p>`
      : "";

    try {
      await sendEmail({
        to: order.email,
        subject: `Order confirmed — #${order._id.slice(-8)}`,
        html: layout(
          "Thanks for your order",
          "We've got it, and it's off to be printed. You'll get another email with tracking as soon as it ships.",
          itemsTable(items) + totals + addressBlock + cta
        ),
      });

      await ctx.runMutation(internal.email.markEmailSent, {
        orderId: args.orderId,
        field: "confirmationEmailSentAt",
      });
    } catch (error) {
      if (attempt + 1 < MAX_EMAIL_ATTEMPTS) {
        await ctx.scheduler.runAfter(
          (attempt + 1) * 60_000,
          internal.email.sendOrderConfirmation,
          { orderId: args.orderId, attempt: attempt + 1 }
        );
        return;
      }
      // Never throw past the retries: a failed email must not take down the
      // payment webhook or the Printful handler that scheduled it.
      console.error(
        `Order confirmation email failed for ${args.orderId}:`,
        error instanceof Error ? error.message : error
      );
    }
  },
});

/**
 * Shipment notification, sent when Printful reports tracking.
 *
 * Scheduled from printful.applyPrintfulUpdate. Guarded on shipmentEmailSentAt
 * because Printful redelivers webhooks.
 */
export const sendShipmentNotification = internalAction({
  args: { orderId: v.id("orders"), attempt: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const attempt = args.attempt ?? 0;

    const data = await ctx.runQuery(internal.email.getOrderForEmail, {
      orderId: args.orderId,
    });
    if (!data) return;

    const { order, items } = data;
    if (order.shipmentEmailSentAt !== undefined) return;
    if (!order.shipment?.trackingNumber) return;

    const shipment = order.shipment;
    const trackingLine = shipment.trackingUrl
      ? `<a href="${shipment.trackingUrl}" style="color:#111">${escapeHtml(shipment.trackingNumber ?? "")}</a>`
      : escapeHtml(shipment.trackingNumber ?? "");

    const trackingBlock = `<p style="margin:0 0 8px;font-size:14px">
<strong>${escapeHtml(shipment.carrier ?? "Carrier")}</strong><br>
Tracking: ${trackingLine}
</p>`;

    const cta = shipment.trackingUrl
      ? `<p style="margin:20px 0 0"><a href="${shipment.trackingUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Track your package</a></p>`
      : "";

    try {
      await sendEmail({
        to: order.email,
        subject: `Your order shipped — #${order._id.slice(-8)}`,
        html: layout(
          "It's on the way",
          "Your order has left the print facility.",
          trackingBlock + itemsTable(items) + cta
        ),
      });

      await ctx.runMutation(internal.email.markEmailSent, {
        orderId: args.orderId,
        field: "shipmentEmailSentAt",
      });
    } catch (error) {
      if (attempt + 1 < MAX_EMAIL_ATTEMPTS) {
        await ctx.scheduler.runAfter(
          (attempt + 1) * 60_000,
          internal.email.sendShipmentNotification,
          { orderId: args.orderId, attempt: attempt + 1 }
        );
        return;
      }
      console.error(
        `Shipment email failed for ${args.orderId}:`,
        error instanceof Error ? error.message : error
      );
    }
  },
});
