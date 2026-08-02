import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const order = useQuery(api.orders.get, { 
    id: id as Id<"orders"> 
  });
  const orderItems = useQuery(api.orders.getOrderItems, {
    orderId: id as Id<"orders">
  });

  if (!order) {
    return <div className="loading">Loading order...</div>;
  }

  return (
    <div className="order-details-page">
      <div className="container">
        <div className="order-header">
          <Link to="/my-account" className="back-link">← Back to My Account</Link>
          <h1>Order #{order._id.slice(-8)}</h1>
          <span className={`order-status ${order.status}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        <div className="order-content">
          <div className="order-info">
            <h2>Order Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <strong>Order Date:</strong>
                <span>{new Date(order._creationTime).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <strong>Total:</strong>
                <span>${order.total.toFixed(2)}</span>
              </div>
              <div className="info-item">
                <strong>Status:</strong>
                <span className={`status ${order.status}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="shipping-info">
            <h2>Shipping Address</h2>
            <div className="address-card">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address1}</p>
              {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          <div className="order-items">
            <h2>Items Ordered</h2>
            {orderItems ? (
              <div className="items-list">
                {orderItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-image">
                      <img src={item.product?.images[0]} alt={item.product?.name} />
                    </div>
                    <div className="item-details">
                      <h3>{item.product?.name}</h3>
                      <p>Variant ID: {item.variantId}</p>
                      <p>Quantity: {item.quantity}</p>
                      <p className="item-price">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading">Loading items...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
