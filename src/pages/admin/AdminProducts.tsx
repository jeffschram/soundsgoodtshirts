import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductEditor, type ProductFormPayload } from "./ProductEditor";

export default function AdminProducts() {
  const products = useQuery(api.admin.listAllProducts);
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const archiveProduct = useMutation(api.admin.deleteProduct);
  const hardDeleteProduct = useMutation(api.admin.hardDeleteProduct);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const editingProduct = products?.find((product) => product._id === editingId);

  const handleArchive = async (id: Id<"products">, name: string) => {
    if (
      !window.confirm(
        `Archive “${name}”? It will leave the storefront but remain in order history.`,
      )
    ) {
      return;
    }
    try {
      await archiveProduct({ id });
      toast.success(`Archived ${name}`);
      if (editingId === id) setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not archive product.",
      );
    }
  };

  const handleHardDelete = async (id: Id<"products">, name: string) => {
    const confirmation = window.prompt(
      `Permanently delete “${name}”? This is only allowed when no order or cart references it.\n\nType the product name exactly to continue:`,
    );
    if (confirmation === null) return;

    try {
      await hardDeleteProduct({ id, confirmation });
      toast.success(`Permanently deleted ${name}`);
      if (editingId === id) setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not permanently delete product.",
      );
    }
  };

  if (products === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const closeEditor = () => {
    setShowCreate(false);
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit storefront details and archive products without damaging order history.
          </p>
        </div>
        <Button
          variant={showCreate ? "outline" : "default"}
          onClick={() => {
            setEditingId(null);
            setShowCreate((current) => !current);
          }}
        >
          {showCreate ? "Cancel" : "Add product"}
        </Button>
      </div>

      {showCreate ? (
        <ProductEditor
          key="create"
          onCancel={closeEditor}
          onSubmit={async (payload: ProductFormPayload) => {
            await createProduct(payload);
            closeEditor();
          }}
        />
      ) : editingProduct ? (
        <ProductEditor
          key={editingProduct._id}
          product={editingProduct}
          onCancel={closeEditor}
          onSubmit={async (payload: ProductFormPayload) => {
            await updateProduct({ id: editingProduct._id, ...payload });
            closeEditor();
          }}
        />
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Variants</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id}>
                <TableCell>
                  <p className="font-medium">{product.name}</p>
                  {product.featured ? (
                    <span className="text-xs text-muted-foreground">Featured</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {product.slug}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${product.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {product.variants.length}
                </TableCell>
                <TableCell>
                  {product.printfulId !== undefined ? (
                    <Badge variant="outline">Printful #{product.printfulId}</Badge>
                  ) : (
                    <Badge variant="secondary">Manual</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setShowCreate(false);
                        setEditingId(product._id);
                      }}
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    {product.active ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void handleArchive(product._id, product.name)}
                        aria-label={`Archive ${product.name}`}
                      >
                        <Archive aria-hidden />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void handleHardDelete(product._id, product.name)}
                      aria-label={`Permanently delete ${product.name}`}
                    >
                      <Trash2 className="text-destructive" aria-hidden />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
