import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {c.to ? (
            <Link to={c.to} className="hover:text-primary">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-700 font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
