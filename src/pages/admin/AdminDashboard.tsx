import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminDashboard() {
  const stats = useQuery(api.admin.dashboardStats);

  if (!stats) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.activeProducts}</span>
          <span className="stat-label">Active Products</span>
          <span className="stat-sub">{stats.totalProducts} total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalOrders}</span>
          <span className="stat-label">Total Orders</span>
          <span className="stat-sub">{stats.pendingOrders} pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">${stats.totalRevenue.toFixed(2)}</span>
          <span className="stat-label">Total Revenue</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalUsers}</span>
          <span className="stat-label">Users</span>
        </div>
      </div>
    </div>
  );
}
