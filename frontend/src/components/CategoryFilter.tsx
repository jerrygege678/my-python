import type { Category, KPType } from "../types";
import { getCategories } from "../data";
import Icon from "./Icon";

export default function CategoryFilter({
  type,
  selected,
  onSelect,
}: {
  type: KPType;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const cats = getCategories(type);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={`badge px-3 py-1 cursor-pointer transition-colors ${
          selected === null
            ? "bg-primary text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
        onClick={() => onSelect(null)}
      >
        全部
      </button>
      {cats.map((c: Category) => (
        <button
          key={c.id}
          className={`badge px-3 py-1 cursor-pointer transition-colors ${
            selected === c.id
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          onClick={() => onSelect(c.id)}
        >
          {c.icon && <Icon name={c.icon} size={14} className="mr-1 align-middle" />}
          {c.name}
        </button>
      ))}
    </div>
  );
}
