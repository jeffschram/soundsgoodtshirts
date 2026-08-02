import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminLayout() {
  const user = useQuery(api.auth.loggedInUser);

  if (user === undefined) {
    return <div className="loading">Loading...</div>;
  }

  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}

function AdminSidebar() {
  const location = useLocation();

  const links = [
    { to: "/admin", label: "Dashboard", exact: true },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/users", label: "Users" },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Admin</h2>
        <Link to="/" className="admin-back-link">Back to site</Link>
      </div>
      <nav className="admin-nav">
        {links.map((link) => {
          const isActive = link.exact
            ? location.pathname === link.to
            : location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`admin-nav-link ${isActive ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
