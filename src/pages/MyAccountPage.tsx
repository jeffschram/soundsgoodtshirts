import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { Navigate, Link } from "react-router-dom";

export default function MyAccountPage() {
  const user = useQuery(api.auth.loggedInUser);
  const userOrders = useQuery(api.orders.listByUser);

  // If user is not signed in, redirect to sign in page
  if (user === null) {
    return <Navigate to="/sign-in" replace />;
  }

  if (user === undefined) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="my-account-page">
      <div className="container">
        <div className="account-header">
          <h1>My Account</h1>
          <SignOutButton />
        </div>

        <div className="account-content">
          <div className="account-info">
            <h2>Account Information</h2>
            <div className="info-card">
              <p><strong>Name:</strong> {user.name || "Not provided"}</p>
              <p><strong>Email:</strong> {user.email || "Not provided"}</p>
            </div>
          </div>

          <div className="order-history">
            <h2>Order History</h2>
            {userOrders && userOrders.length > 0 ? (
              <div className="orders-list">
                {userOrders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <h3>Order #{order._id.slice(-8)}</h3>
                      <span className={`order-status ${order.status}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className="order-details">
                      <p><strong>Date:</strong> {new Date(order._creationTime).toLocaleDateString()}</p>
                      <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
                      <p><strong>Items:</strong> {order.items.length} item(s)</p>
                    </div>
                    <Link to={`/order/${order._id}`} className="view-order-button">
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-orders">
                <p>You haven't placed any orders yet.</p>
                <Link to="/shop" className="shop-button">Start Shopping</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
