interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export default function TagFilter({ 
  tags, 
  selectedTag, 
  onTagChange 
}: TagFilterProps) {
  return (
    <div className="tag-filter">
      <h3>Filter by Tags</h3>
      <div className="tag-buttons">
        <button
          className={`filter-button ${selectedTag === null ? 'active' : ''}`}
          onClick={() => onTagChange(null)}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            className={`filter-button ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => onTagChange(tag)}
          >
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
