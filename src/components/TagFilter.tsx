import { Button } from "@/components/ui/button";

interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export default function TagFilter({
  tags,
  selectedTag,
  onTagChange,
}: TagFilterProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Filter by Tags
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={selectedTag === null ? "secondary" : "ghost"}
          onClick={() => onTagChange(null)}
        >
          All
        </Button>
        {tags.map((tag) => (
          <Button
            key={tag}
            size="sm"
            variant={selectedTag === tag ? "secondary" : "ghost"}
            onClick={() => onTagChange(tag)}
          >
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}
