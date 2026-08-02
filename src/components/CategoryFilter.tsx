import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={selectedCategory === null ? "default" : "outline"}
        onClick={() => onCategoryChange(null)}
      >
        All
      </Button>
      {categories.map((category) => (
        <Button
          key={category}
          size="sm"
          variant={selectedCategory === category ? "default" : "outline"}
          onClick={() => onCategoryChange(category)}
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Button>
      ))}
    </div>
  );
}
