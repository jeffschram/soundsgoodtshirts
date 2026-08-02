import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const orders = useQuery(api.admin.listAllOrders);
  const updateStatus = useMutation(api.admin.updateOrderStatus);

  if (!orders) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="admin-orders">
      <h1>Orders</h1>

      {orders.length === 0 ? (
        <p className="admin-empty">No orders yet.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table-header">
            <span>Order</span>
            <span>Email</span>
            <span>Total</span>
            <span>Items</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          {orders.map((order) => (
            <div key={order._id} className="admin-table-row">
              <span className="admin-id">#{order._id.slice(-8)}</span>
              <span>{order.email}</span>
              <span>${order.total.toFixed(2)}</span>
              <span>{order.items.length}</span>
              <span>
                <select
                  className="admin-status-select"
                  value={order.status}
                  onChange={(e) =>
                    updateStatus({ id: order._id, status: e.target.value })
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </span>
              <span>{new Date(order._creationTime).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
