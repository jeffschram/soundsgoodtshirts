import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProducts() {
  const products = useQuery(api.admin.listAllProducts);
  const updateProduct = useMutation(api.admin.updateProduct);
  const deleteProduct = useMutation(api.admin.deleteProduct);
  const createProduct = useMutation(api.admin.createProduct);
  const syncPrintfulProducts = useAction(api.admin.syncPrintfulProducts);
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { synced, deactivated } = await syncPrintfulProducts();
      toast.success(
        `Synced ${synced} product${synced === 1 ? "" : "s"} from Printful` +
          (deactivated > 0
            ? `, deactivated ${deactivated} no longer in the store`
            : "")
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Printful sync failed."
      );
    } finally {
      setSyncing(false);
    }
  };

  if (!products) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            <RefreshCw className={syncing ? "animate-spin" : undefined} />
            {syncing ? "Syncing…" : "Sync from Printful"}
          </Button>
          <Button
            variant={showCreate ? "outline" : "default"}
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? "Cancel" : "Add Product"}
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateProductForm
          onCreate={async (data) => {
            await createProduct(data);
            setShowCreate(false);
          }}
        />
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {product.slug}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${product.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={product.featured}
                    onCheckedChange={(checked) =>
                      updateProduct({
                        id: product._id,
                        featured: checked === true,
                      })
                    }
                    aria-label={`Toggle featured for ${product.name}`}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={product.active}
                    onCheckedChange={(checked) =>
                      updateProduct({
                        id: product._id,
                        active: checked === true,
                      })
                    }
                    aria-label={`Toggle active for ${product.name}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (confirm("Permanently delete this product?")) {
                        deleteProduct({ id: product._id });
                      }
                    }}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
        slug:
          form.slug ||
          form.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        description: form.description,
        price: parseFloat(form.price),
        images: [],
        categories: form.categories
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        featured: form.featured,
        variants: [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-slug">Slug</Label>
              <Input
                id="product-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="Auto-generated from name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-categories">
                Categories (comma-separated)
              </Label>
              <Input
                id="product-categories"
                value={form.categories}
                onChange={(e) =>
                  setForm({ ...form, categories: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-tags">Tags (comma-separated)</Label>
              <Input
                id="product-tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="product-featured"
              checked={form.featured}
              onCheckedChange={(checked) =>
                setForm({ ...form, featured: checked === true })
              }
            />
            <Label htmlFor="product-featured">Featured</Label>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Product"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
