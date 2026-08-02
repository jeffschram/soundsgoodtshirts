import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  // Guests arrive from the Stripe redirect carrying an access token; signed-in
  // owners and admins are authorised without one.
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? undefined;

  const order = useQuery(api.orders.get, {
    id: id as Id<"orders">,
    token,
  });
  const orderItems = useQuery(api.orders.getOrderItems, {
    orderId: id as Id<"orders">,
    token,
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        to="/my-account"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to My Account
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          Order #{order._id.slice(-8)}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order Date</span>
              <span>
                {new Date(order._creationTime).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">
                ${order.total.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <OrderStatusBadge status={order.status} />
            </div>
            {order.shipment?.trackingNumber && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Tracking
                  {order.shipment.carrier ? ` (${order.shipment.carrier})` : ""}
                </span>
                {order.shipment.trackingUrl ? (
                  <a
                    href={order.shipment.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs underline underline-offset-4"
                  >
                    {order.shipment.trackingNumber}
                  </a>
                ) : (
                  <span className="font-mono text-xs">
                    {order.shipment.trackingNumber}
                  </span>
                )}
              </div>
            )}
            {order.shipment?.shippedAt && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Shipped</span>
                <span>
                  {new Date(order.shipment.shippedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {order.shippingAddress.name}
            </p>
            <p>{order.shippingAddress.address1}</p>
            {order.shippingAddress.address2 && (
              <p>{order.shippingAddress.address2}</p>
            )}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.zip}
            </p>
            <p>{order.shippingAddress.country}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Items Ordered</CardTitle>
        </CardHeader>
        <CardContent>
          {orderItems ? (
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <img
                      src={item.product?.images[0]}
                      alt={item.product?.name}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{item.product?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Variant {item.variantId} &middot; Qty {item.quantity}{" "}
                      &middot;{" "}
                      <span className="tabular-nums">
                        ${item.price.toFixed(2)} each
                      </span>
                    </p>
                  </div>
                  <div className="font-medium tabular-nums">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
