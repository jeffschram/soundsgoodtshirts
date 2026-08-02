interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: CategoryFilterProps) {
  return (
    <div className="category-filter">
      <button
        className={`filter-button ${selectedCategory === null ? 'active' : ''}`}
        onClick={() => onCategoryChange(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
          onClick={() => onCategoryChange(category)}
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </button>
      ))}
    </div>
  );
}
