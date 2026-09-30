import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type CollectionRow = Doc<"collections"> & { productCount: number };

type CollectionPayload = {
  slug: string;
  name: string;
  eyebrow: string;
  headingCopy: string;
  headingAccent: string;
  aside: string;
  order: number;
  showOnHomepage: boolean;
  active: boolean;
};

/**
 * Must stay identical to categorySlug() in convex/collections.ts: the slug is
 * the key product categories are matched against, so a preview that disagreed
 * with the server would send the owner hunting for a collection that silently
 * matches nothing.
 */
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminCollections() {
  const collections = useQuery(api.admin.listAllCollections);
  const createCollection = useMutation(api.admin.createCollection);
  const updateCollection = useMutation(api.admin.updateCollection);
  const deleteCollection = useMutation(api.admin.deleteCollection);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<Id<"collections"> | null>(null);
  const editing = collections?.find(
    (collection) => collection._id === editingId,
  );

  const closeEditor = () => {
    setShowCreate(false);
    setEditingId(null);
  };

  const patch = async (
    collection: CollectionRow,
    updates: Parameters<typeof updateCollection>[0],
  ) => {
    try {
      await updateCollection(updates);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not update ${collection.name}.`,
      );
    }
  };

  /**
   * Swap `order` with the neighbour rather than renumbering the list, so two
   * collections can never end up sharing a position.
   */
  const move = async (index: number, direction: -1 | 1) => {
    if (!collections) return;
    const current = collections[index];
    const neighbour = collections[index + direction];
    if (!current || !neighbour) return;

    await patch(current, { id: current._id, order: neighbour.order });
    await patch(neighbour, { id: neighbour._id, order: current.order });
  };

  const handleDelete = async (collection: CollectionRow) => {
    if (
      !window.confirm(
        `Delete the “${collection.name}” collection? Its products are not affected — they keep their categories.`,
      )
    ) {
      return;
    }
    try {
      await deleteCollection({ id: collection._id });
      toast.success(`Deleted ${collection.name}`);
      if (editingId === collection._id) setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete collection.",
      );
    }
  };

  if (collections === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group shirts into homepage sections. A product joins a collection
            when one of its categories matches the collection’s slug.
          </p>
        </div>
        <Button
          variant={showCreate ? "outline" : "default"}
          onClick={() => {
            setEditingId(null);
            setShowCreate((current) => !current);
          }}
        >
          {showCreate ? "Cancel" : "Add collection"}
        </Button>
      </div>

      {showCreate ? (
        <CollectionEditor
          key="create"
          onCancel={closeEditor}
          onSubmit={async (payload) => {
            await createCollection(payload);
            closeEditor();
          }}
        />
      ) : editing ? (
        <CollectionEditor
          key={editing._id}
          collection={editing}
          onCancel={closeEditor}
          onSubmit={async (payload) => {
            await updateCollection({ id: editing._id, ...payload });
            closeEditor();
          }}
        />
      ) : null}

      {collections.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No collections yet. Until one is flagged for the homepage, the
          homepage falls back to showing every shirt.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead>Homepage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection, index) => (
                <TableRow key={collection._id}>
                  <TableCell>
                    <p className="font-medium">{collection.name}</p>
                    {collection.headingCopy ? (
                      <span className="text-xs text-muted-foreground">
                        {collection.headingCopy.replace(/\n/g, " ")}
                        {collection.headingAccent
                          ? ` ${collection.headingAccent}`
                          : ""}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {collection.slug}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {collection.productCount === 0 ? (
                      <span
                        className="text-destructive"
                        title="No active product has a category matching this slug."
                      >
                        0
                      </span>
                    ) : (
                      collection.productCount
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void patch(collection, {
                          id: collection._id,
                          showOnHomepage: !collection.showOnHomepage,
                        })
                      }
                      aria-label={`${
                        collection.showOnHomepage ? "Hide" : "Show"
                      } ${collection.name} on the homepage`}
                    >
                      {collection.showOnHomepage ? (
                        <>
                          <Eye aria-hidden /> Shown
                        </>
                      ) : (
                        <>
                          <EyeOff aria-hidden /> Hidden
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={collection.active ? "default" : "secondary"}
                    >
                      {collection.active ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <span className="tabular-nums text-muted-foreground">
                        {collection.order}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0}
                        onClick={() => void move(index, -1)}
                        aria-label={`Move ${collection.name} earlier`}
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === collections.length - 1}
                        onClick={() => void move(index, 1)}
                        aria-label={`Move ${collection.name} later`}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setShowCreate(false);
                          setEditingId(collection._id);
                        }}
                        aria-label={`Edit ${collection.name}`}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void handleDelete(collection)}
                        aria-label={`Delete ${collection.name}`}
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
      )}
    </div>
  );
}

function CollectionEditor({
  collection,
  onSubmit,
  onCancel,
}: {
  collection?: CollectionRow;
  onSubmit: (payload: CollectionPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => ({
    name: collection?.name ?? "",
    slug: collection?.slug ?? "",
    eyebrow: collection?.eyebrow ?? "",
    headingCopy: collection?.headingCopy ?? "",
    headingAccent: collection?.headingAccent ?? "",
    aside: collection?.aside ?? "",
    order: collection ? String(collection.order) : "",
    showOnHomepage: collection?.showOnHomepage ?? false,
    active: collection?.active ?? true,
  }));
  const [submitting, setSubmitting] = useState(false);

  const effectiveSlug = slugify(draft.slug || draft.name);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (!draft.name.trim()) throw new Error("Collection name is required.");
      if (!effectiveSlug) throw new Error("Collection slug is required.");

      const order = draft.order === "" ? 0 : Number(draft.order);
      if (!Number.isFinite(order)) {
        throw new Error("Order must be a number.");
      }

      await onSubmit({
        name: draft.name.trim(),
        slug: effectiveSlug,
        eyebrow: draft.eyebrow,
        headingCopy: draft.headingCopy,
        headingAccent: draft.headingAccent,
        aside: draft.aside,
        order,
        showOnHomepage: draft.showOnHomepage,
        active: draft.active,
      });
      toast.success(
        collection ? `Saved ${collection.name}` : "Collection created",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save collection.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          {collection ? `Edit ${collection.name}` : "New collection"}
        </CardTitle>
        <CardDescription>
          The slug doubles as the public URL (/collection/{effectiveSlug || "…"}
          ) and as the category products are matched on.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="collection-name">
              <Input
                id="collection-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                required
              />
            </Field>
            <Field label="Slug" htmlFor="collection-slug">
              <Input
                id="collection-slug"
                value={draft.slug}
                onChange={(event) =>
                  setDraft({ ...draft, slug: event.target.value })
                }
                placeholder="Auto-generated from name"
              />
              <p className="text-xs text-muted-foreground">
                Products with the category{" "}
                <span className="font-mono">{effectiveSlug || "…"}</span> land
                in this collection.
              </p>
            </Field>
            <Field label="Eyebrow" htmlFor="collection-eyebrow">
              <Input
                id="collection-eyebrow"
                value={draft.eyebrow}
                onChange={(event) =>
                  setDraft({ ...draft, eyebrow: event.target.value })
                }
                placeholder="Fresh from the brain"
              />
            </Field>
            <Field label="Order" htmlFor="collection-order">
              <Input
                id="collection-order"
                type="number"
                step="1"
                value={draft.order}
                onChange={(event) =>
                  setDraft({ ...draft, order: event.target.value })
                }
                placeholder="Appended to the end"
              />
            </Field>
            <Field
              label="Heading (line breaks allowed)"
              htmlFor="collection-heading"
            >
              <Textarea
                id="collection-heading"
                value={draft.headingCopy}
                onChange={(event) =>
                  setDraft({ ...draft, headingCopy: event.target.value })
                }
                rows={2}
                placeholder="The spaghetti"
              />
              <p className="text-xs text-muted-foreground">
                Defaults to the collection name.
              </p>
            </Field>
            <Field label="Heading accent line" htmlFor="collection-accent">
              <Input
                id="collection-accent"
                value={draft.headingAccent}
                onChange={(event) =>
                  setDraft({ ...draft, headingAccent: event.target.value })
                }
                placeholder="collection."
              />
              <p className="text-xs text-muted-foreground">
                Rendered in the coral serif italic, on its own line.
              </p>
            </Field>
            <Field
              label="Aside (line breaks allowed)"
              htmlFor="collection-aside"
              className="md:col-span-2"
            >
              <Textarea
                id="collection-aside"
                value={draft.aside}
                onChange={(event) =>
                  setDraft({ ...draft, aside: event.target.value })
                }
                rows={3}
                placeholder={"Two deeply important positions.\nPick a side."}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-5 md:col-span-2">
              <CheckField
                id="collection-homepage"
                label="Show on homepage"
                checked={draft.showOnHomepage}
                onChange={(showOnHomepage) =>
                  setDraft({ ...draft, showOnHomepage })
                }
              />
              <CheckField
                id="collection-active"
                label="Active"
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
              />
            </div>
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
                : collection
                  ? "Save changes"
                  : "Create collection"}
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
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
