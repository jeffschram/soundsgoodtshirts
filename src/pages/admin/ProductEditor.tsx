import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type VariantDraft = {
  key: string;
  id: string;
  name: string;
  size: string;
  color: string;
  price: string;
  available: boolean;
};

type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  price: string;
  images: string;
  categories: string;
  tags: string;
  featured: boolean;
  active: boolean;
  variants: VariantDraft[];
};

export type ProductFormPayload = {
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  categories: string[];
  tags: string[];
  featured: boolean;
  active: boolean;
  variants: Array<{
    id: number;
    name: string;
    size: string;
    color: string;
    price: number;
    available: boolean;
  }>;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFor(product?: Doc<"products">): ProductDraft {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    images: product?.images.join("\n") ?? "",
    categories: product?.categories.join(", ") ?? "",
    tags: product?.tags?.join(", ") ?? "",
    featured: product?.featured ?? false,
    active: product?.active ?? true,
    variants:
      product?.variants.map((variant) => ({
        key: `${variant.id}-${crypto.randomUUID()}`,
        id: String(variant.id),
        name: variant.name,
        size: variant.size,
        color: variant.color,
        price: String(variant.price),
        available: variant.available,
      })) ?? [],
  };
}

function toPayload(draft: ProductDraft): ProductFormPayload {
  const name = draft.name.trim();
  const slug = slugify(draft.slug || draft.name);
  const price = Number(draft.price);
  const images = splitList(draft.images, /\r?\n/);

  if (!name) throw new Error("Product name is required.");
  if (!slug) throw new Error("Product slug is required.");
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Product price must be zero or greater.");
  }
  if (images.length === 0)
    throw new Error("Add at least one product image URL.");
  if (draft.variants.length === 0)
    throw new Error("Add at least one product variant.");

  const variants = draft.variants.map((variant, index) => {
    const id = Number(variant.id);
    const variantPrice = Number(variant.price);
    if (!Number.isInteger(id)) {
      throw new Error(`Variant ${index + 1} needs a whole-number ID.`);
    }
    if (!variant.name.trim() || !variant.size.trim() || !variant.color.trim()) {
      throw new Error(`Variant ${index + 1} needs a name, size, and color.`);
    }
    if (!Number.isFinite(variantPrice) || variantPrice < 0) {
      throw new Error(`Variant ${index + 1} price must be zero or greater.`);
    }
    return {
      id,
      name: variant.name.trim(),
      size: variant.size.trim(),
      color: variant.color.trim(),
      price: variantPrice,
      available: variant.available,
    };
  });

  return {
    name,
    slug,
    description: draft.description.trim(),
    price,
    images,
    categories: splitList(draft.categories, /,/),
    tags: splitList(draft.tags, /,/),
    featured: draft.featured,
    active: draft.active,
    variants,
  };
}


/** Images larger than this are almost always an unresized phone photo. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Hand-uploaded product photography.
 *
 * Separate from the Printful mockup URLs above: these live in Convex file
 * storage, the sync cannot touch them, and they render ahead of the mockups on
 * the product page. Only available on a saved product, since the files attach
 * to a product id.
 */
function CustomImageUploader({ productId }: { productId: Id<"products"> }) {
  const images = useQuery(api.admin.getProductCustomImages, { id: productId });
  const generateUploadUrl = useMutation(api.admin.generateProductImageUploadUrl);
  const addImage = useMutation(api.admin.addProductImage);
  const removeImage = useMutation(api.admin.removeProductImage);
  const reorderImages = useMutation(api.admin.reorderProductImages);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(
            `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — resize it under 5MB first.`,
          );
          continue;
        }

        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        await addImage({ id: productId, storageId });
      }
      toast.success("Images uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!images) return;
    const next = images.map((image) => image.storageId);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await reorderImages({ id: productId, storageIds: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Custom images</h3>
          <p className="text-sm text-muted-foreground">
            Your own photography. Shown before the Printful mockups, and never
            touched by a sync. The first image leads the gallery.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {uploading ? "Uploading…" : "Upload images"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {images === undefined ? (
        <p className="text-sm text-muted-foreground">Loading images…</p>
      ) : images.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No custom images yet — this product shows Printful mockups only.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <li key={image.storageId} className="w-28 space-y-1">
              <div className="overflow-hidden rounded-md border bg-muted">
                <img
                  src={image.url}
                  alt={`Custom image ${index + 1}`}
                  className="aspect-square size-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                >
                  <ArrowLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move image ${index + 1} later`}
                  disabled={index === images.length - 1}
                  onClick={() => void move(index, 1)}
                >
                  <ArrowRight />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => {
                    if (window.confirm("Delete this image permanently?")) {
                      void removeImage({
                        id: productId,
                        storageId: image.storageId,
                      });
                    }
                  }}
                >
                  <X className="text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductEditor({
  product,
  onSubmit,
  onCancel,
}: {
  product?: Doc<"products">;
  onSubmit: (payload: ProductFormPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => draftFor(product));
  const [submitting, setSubmitting] = useState(false);
  const printfulManaged = product?.printfulId !== undefined;

  const setVariant = (index: number, patch: Partial<VariantDraft>) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    }));
  };

  const addVariant = () => {
    const nextId =
      draft.variants.reduce((largest, variant) => {
        const id = Number(variant.id);
        return Number.isInteger(id) ? Math.max(largest, id) : largest;
      }, 0) + 1;
    setDraft((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          key: crypto.randomUUID(),
          id: String(nextId),
          name: "",
          size: "",
          color: "",
          price: current.price,
          available: true,
        },
      ],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(toPayload(draft));
      toast.success(product ? `Saved ${product.name}` : "Product created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save product.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          {product ? `Edit ${product.name}` : "New Product"}
        </CardTitle>
        <CardDescription>
          Product details update the storefront immediately after saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {printfulManaged ? (
            <div className="flex gap-3 rounded-lg border border-amber-500 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                Printful sync overwrites this product’s name, slug, price,
                images, variants, active status, and the “About the shirt”
                garment text. Edit those in Printful. The storefront
                description below is yours — the sync never touches it — as are
                featured status and non-empty categories and tags.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="editor-product-name">
              <Input
                id="editor-product-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                disabled={printfulManaged}
                required
              />
            </Field>
            <Field label="Slug" htmlFor="editor-product-slug">
              <Input
                id="editor-product-slug"
                value={draft.slug}
                onChange={(event) =>
                  setDraft({ ...draft, slug: event.target.value })
                }
                placeholder="Auto-generated from name"
                disabled={printfulManaged}
              />
            </Field>
            <Field label="Price" htmlFor="editor-product-price">
              <Input
                id="editor-product-price"
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) =>
                  setDraft({ ...draft, price: event.target.value })
                }
                disabled={printfulManaged}
                required
              />
            </Field>
            <Field
              label="Categories (comma-separated)"
              htmlFor="editor-product-categories"
            >
              <Input
                id="editor-product-categories"
                value={draft.categories}
                onChange={(event) =>
                  setDraft({ ...draft, categories: event.target.value })
                }
              />
            </Field>
            <Field label="Tags (comma-separated)" htmlFor="editor-product-tags">
              <Input
                id="editor-product-tags"
                value={draft.tags}
                onChange={(event) =>
                  setDraft({ ...draft, tags: event.target.value })
                }
              />
            </Field>
            <div className="flex flex-wrap items-center gap-5 pt-7">
              <CheckField
                id="editor-product-featured"
                label="Featured"
                checked={draft.featured}
                onChange={(featured) => setDraft({ ...draft, featured })}
              />
              <CheckField
                id="editor-product-active"
                label="Active"
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
                disabled={printfulManaged}
              />
            </div>
            <Field
              label="Storefront description"
              htmlFor="editor-product-description"
              className="md:col-span-2"
            >
              <Textarea
                id="editor-product-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                rows={4}
                disabled={printfulManaged}
              />
            </Field>
            <Field
              label="Image URLs (one per line)"
              htmlFor="editor-product-images"
              className="md:col-span-2"
            >
              <Textarea
                id="editor-product-images"
                value={draft.images}
                onChange={(event) =>
                  setDraft({ ...draft, images: event.target.value })
                }
                disabled={printfulManaged}
                rows={4}
                required
              />
            </Field>
          </div>

          {/* Only on a saved product — uploads attach to a product id. */}
          {product ? <CustomImageUploader productId={product._id} /> : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Variants</h3>
                <p className="text-sm text-muted-foreground">
                  IDs must match the variant IDs used by carts and fulfillment.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
                disabled={printfulManaged}
              >
                <Plus aria-hidden /> Add variant
              </Button>
            </div>

            {draft.variants.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                Add at least one variant before saving.
              </p>
            ) : (
              <div className="space-y-3">
                {draft.variants.map((variant, index) => (
                  <div
                    key={variant.key}
                    className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-6"
                  >
                    <Field label="ID" htmlFor={`variant-${index}-id`}>
                      <Input
                        id={`variant-${index}-id`}
                        type="number"
                        step="1"
                        value={variant.id}
                        onChange={(event) =>
                          setVariant(index, { id: event.target.value })
                        }
                        disabled={printfulManaged}
                      />
                    </Field>
                    <Field label="Name" htmlFor={`variant-${index}-name`}>
                      <Input
                        id={`variant-${index}-name`}
                        value={variant.name}
                        onChange={(event) =>
                          setVariant(index, { name: event.target.value })
                        }
                        disabled={printfulManaged}
                      />
                    </Field>
                    <Field label="Size" htmlFor={`variant-${index}-size`}>
                      <Input
                        id={`variant-${index}-size`}
                        value={variant.size}
                        onChange={(event) =>
                          setVariant(index, { size: event.target.value })
                        }
                        disabled={printfulManaged}
                      />
                    </Field>
                    <Field label="Color" htmlFor={`variant-${index}-color`}>
                      <Input
                        id={`variant-${index}-color`}
                        value={variant.color}
                        onChange={(event) =>
                          setVariant(index, { color: event.target.value })
                        }
                        disabled={printfulManaged}
                      />
                    </Field>
                    <Field label="Price" htmlFor={`variant-${index}-price`}>
                      <Input
                        id={`variant-${index}-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price}
                        onChange={(event) =>
                          setVariant(index, { price: event.target.value })
                        }
                        disabled={printfulManaged}
                      />
                    </Field>
                    <div className="flex items-end justify-between gap-3 pb-2">
                      <CheckField
                        id={`variant-${index}-available`}
                        label="Available"
                        checked={variant.available}
                        onChange={(available) =>
                          setVariant(index, { available })
                        }
                        disabled={printfulManaged}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            variants: current.variants.filter(
                              (_, variantIndex) => variantIndex !== index,
                            ),
                          }))
                        }
                        disabled={printfulManaged}
                        aria-label={`Remove variant ${index + 1}`}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : product
                  ? "Save changes"
                  : "Create product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function CheckField({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        disabled={disabled}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
