import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  processing: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  shipped:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  delivered:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent capitalize", STATUS_STYLES[status])}
    >
      {status}
    </Badge>
  );
}
