import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const stats = useQuery(api.admin.dashboardStats);

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Active Products",
      value: stats.activeProducts,
      sub: `${stats.totalProducts} total`,
    },
    {
      label: "Total Orders",
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} pending`,
    },
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      sub: null,
    },
    { label: "Users", value: stats.totalUsers, sub: null },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {card.value}
              </CardTitle>
            </CardHeader>
            {card.sub && (
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
