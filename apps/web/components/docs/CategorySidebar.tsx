'use client';

interface CategoryCount {
  name: string;
  count: number;
}

interface Props {
  categories: CategoryCount[];
  totalCount: number;
  active: string | null;
  onChange: (category: string | null) => void;
}

export default function CategorySidebar({
  categories,
  totalCount,
  active,
  onChange,
}: Props) {
  return (
    <aside className="w-[200px] flex-shrink-0 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Categories
      </p>
      <div className="space-y-0.5">
        <CategoryRow
          label="All Documents"
          count={totalCount}
          active={active === null}
          onClick={() => onChange(null)}
        />
        {categories.map((c) => (
          <CategoryRow
            key={c.name}
            label={c.name}
            count={c.count}
            active={active === c.name}
            onClick={() => onChange(c.name)}
          />
        ))}
      </div>
    </aside>
  );
}

function CategoryRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-[#25D366]/10 text-[#25D366] font-semibold'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? 'bg-[#25D366]/20' : 'bg-gray-100'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
