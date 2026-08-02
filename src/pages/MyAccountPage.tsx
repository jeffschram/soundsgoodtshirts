import { useQuery } from "convex/react";
import { Navigate, Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "@/SignOutButton";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyAccountPage() {
  const user = useQuery(api.auth.loggedInUser);
  const userOrders = useQuery(api.orders.listByUser);

  // If user is not signed in, redirect to sign in page
  if (user === null) {
    return <Navigate to="/sign-in" replace />;
  }

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <SignOutButton />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Name:</span>{" "}
            <span className="text-muted-foreground">
              {user.name || "Not provided"}
            </span>
          </p>
          <p>
            <span className="font-medium">Email:</span>{" "}
            <span className="text-muted-foreground">
              {user.email || "Not provided"}
            </span>
          </p>
        </CardContent>
      </Card>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">
        Order History
      </h2>

      {userOrders === undefined ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : userOrders.length > 0 ? (
        <div className="mt-4 space-y-4">
          {userOrders.map((order) => (
            <Card key={order._id}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">
                      Order #{order._id.slice(-8)}
                    </h3>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order._creationTime).toLocaleDateString()} &middot;{" "}
                    {order.items.length} item(s) &middot;{" "}
                    <span className="tabular-nums">
                      ${order.total.toFixed(2)}
                    </span>
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/order/${order._id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-dashed py-16">
          <p className="text-muted-foreground">
            You haven't placed any orders yet.
          </p>
          <Button asChild>
            <Link to="/shop">Start Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
