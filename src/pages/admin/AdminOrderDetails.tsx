import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  ORDER_STATUSES,
  OrderStatusBadge,
} from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminOrderDetails() {
  const { orderId } = useParams();
  const id = orderId as Id<"orders"> | undefined;
  const order = useQuery(api.admin.getOrderDetail, id ? { id } : "skip");
  const updateStatus = useMutation(api.admin.updateOrderStatus);

  if (!id) {
    return <p className="text-sm text-destructive">Missing order ID.</p>;
  }

  if (order === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (order === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order not found</CardTitle>
          <CardDescription>
            The order may have been removed or the link is invalid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/admin/orders">Back to orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const shortId = order._id.slice(-8);
  const setStatus = async (status: string) => {
    try {
      await updateStatus({ id: order._id, status });
      toast.success(`Order #${shortId} is now ${status.replace(/_/g, " ")}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update order status.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link to="/admin/orders">
              <ArrowLeft aria-hidden /> Orders
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{shortId}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {new Date(order._creationTime).toLocaleString()} by{" "}
            {order.email}
          </p>
        </div>
        <Select
          value={order.status}
          onValueChange={(status) => void setStatus(status)}
        >
          <SelectTrigger className="w-44 capitalize" aria-label="Order status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>
            {order.items.length} item line{order.items.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={`${item.productId}-${item.variantId}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt=""
                          className="size-12 rounded-md border object-cover"
                        />
                      ) : null}
                      <span className="font-medium">{item.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{item.variantName ?? `Variant #${item.variantId}`}</p>
                    {item.size || item.color ? (
                      <p className="text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${item.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    ${(item.price * item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">
                  Order total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  ${order.total.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6">
            <p className="font-medium">{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.address1}</p>
            {order.shippingAddress.address2 ? (
              <p>{order.shippingAddress.address2}</p>
            ) : null}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.zip}
            </p>
            <p>{order.shippingAddress.country}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>
              Stripe identifiers and captured order value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetadataRow label="Customer" value={order.email} />
            <MetadataRow label="Total" value={`$${order.total.toFixed(2)}`} />
            <MetadataRow
              label="Payment intent"
              value={order.stripePaymentIntentId}
              mono
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfillment</CardTitle>
            <CardDescription>
              Printful submission status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetadataRow
              label="Printful order"
              value={
                order.printfulOrderId ? `#${order.printfulOrderId}` : undefined
              }
              mono
            />
            {!order.printfulOrderId ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <PackageCheck className="size-4" aria-hidden /> Not submitted to
                Printful yet
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetadataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 break-all text-sm ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
