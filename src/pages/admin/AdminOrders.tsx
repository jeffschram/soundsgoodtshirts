import { useQuery, useMutation } from "convex/react";
import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { ORDER_STATUSES } from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrders() {
  const orders = useQuery(api.admin.listAllOrders);
  const updateStatus = useMutation(api.admin.updateOrderStatus);

  if (!orders) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No orders yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-mono text-xs">
                    #{order._id.slice(-8)}
                  </TableCell>
                  <TableCell>{order.email}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${order.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {order.items.length}
                  </TableCell>
                  <TableCell data-slot="order-status">
                    <Select
                      value={order.status}
                      onValueChange={(status) =>
                        updateStatus({ id: order._id, status })
                      }
                    >
                      <SelectTrigger size="sm" className="w-36 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="max-w-64 text-xs">
                    {order.fulfillmentError ? (
                      <span
                        className="text-destructive"
                        title={order.fulfillmentError}
                      >
                        {order.fulfillmentError.slice(0, 70)}
                        {order.fulfillmentError.length > 70 ? "…" : ""}
                      </span>
                    ) : order.shipment?.trackingNumber ? (
                      <a
                        href={order.shipment.trackingUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono underline underline-offset-4"
                      >
                        {order.shipment.carrier ?? "Tracking"}{" "}
                        {order.shipment.trackingNumber}
                      </a>
                    ) : order.printfulOrderId ? (
                      <span className="font-mono text-muted-foreground">
                        Printful #{order.printfulOrderId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(order._creationTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/orders/${order._id}`}>
                        <Eye aria-hidden /> View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
