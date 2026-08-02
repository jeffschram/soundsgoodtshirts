import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function AdminProducts() {
  const products = useQuery(api.admin.listAllProducts);
  const updateProduct = useMutation(api.admin.updateProduct);
  const deleteProduct = useMutation(api.admin.deleteProduct);
  const createProduct = useMutation(api.admin.createProduct);
  const [showCreate, setShowCreate] = useState(false);

  if (!products) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="admin-products">
      <div className="admin-page-header">
        <h1>Products</h1>
        <button
          className="admin-button primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "Add Product"}
        </button>
      </div>

      {showCreate && (
        <CreateProductForm
          onCreate={async (data) => {
            await createProduct(data);
            setShowCreate(false);
          }}
        />
      )}

      <div className="admin-table">
        <div className="admin-table-header">
          <span>Name</span>
          <span>Slug</span>
          <span>Price</span>
          <span>Featured</span>
          <span>Active</span>
          <span>Actions</span>
        </div>
        {products.map((product) => (
          <div key={product._id} className="admin-table-row">
            <span>{product.name}</span>
            <span className="admin-slug">{product.slug}</span>
            <span>${product.price.toFixed(2)}</span>
            <span>
              <button
                className={`admin-toggle ${product.featured ? "on" : "off"}`}
                onClick={() =>
                  updateProduct({ id: product._id, featured: !product.featured })
                }
              >
                {product.featured ? "Yes" : "No"}
              </button>
            </span>
            <span>
              <button
                className={`admin-toggle ${product.active ? "on" : "off"}`}
                onClick={() =>
                  updateProduct({ id: product._id, active: !product.active })
                }
              >
                {product.active ? "Yes" : "No"}
              </button>
            </span>
            <span className="admin-actions">
              <button
                className="admin-button danger"
                onClick={() => {
                  if (confirm("Permanently delete this product?")) {
                    deleteProduct({ id: product._id });
                  }
                }}
              >
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateProductForm({
  onCreate,
}: {
  onCreate: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    categories: "",
    tags: "",
    featured: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: form.description,
        price: parseFloat(form.price),
        images: [],
        categories: form.categories.split(",").map((c) => c.trim()).filter(Boolean),
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        featured: form.featured,
        variants: [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-create-form" onSubmit={handleSubmit}>
      <h2>New Product</h2>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="admin-field">
          <label>Slug</label>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="Auto-generated from name"
          />
        </div>
        <div className="admin-field">
          <label>Price</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>
        <div className="admin-field full-width">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        <div className="admin-field">
          <label>Categories (comma-separated)</label>
          <input
            value={form.categories}
            onChange={(e) => setForm({ ...form, categories: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label>Tags (comma-separated)</label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            {" "}Featured
          </label>
        </div>
      </div>
      <button className="admin-button primary" type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
