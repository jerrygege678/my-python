import { Link } from "react-router-dom";
import type { KnowledgePoint } from "../types";
import { getCategoryById } from "../data";
import { useProgress } from "../store/ProgressContext";
import StatusBadge from "./StatusBadge";
import Icon from "./Icon";

const diffStars: Record<number, string> = { 1: "★", 2: "★★", 3: "★★★" };

export default function KpCard({ kp }: { kp: KnowledgePoint }) {
  const { isKpCompleted } = useProgress();
  const cat = getCategoryById(kp.category);
  const total = kp.questions?.length ?? 0;
  const completed = isKpCompleted(kp.id, total);
  const href = kp.type === "online" ? `/online/${kp.id}` : `/offline/${kp.id}`;

  return (
    <Link to={href} className="card p-4 block hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {cat?.icon && (
            <span className="text-primary">
              <Icon name={cat.icon} size={18} />
            </span>
          )}
          <h3 className="font-semibold text-slate-900">{kp.title}</h3>
        </div>
        <StatusBadge variant={completed ? "passed" : "todo"} />
      </div>
      <p className="mt-2 text-sm text-slate-500 line-clamp-2">{kp.summary}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        <span>{diffStars[kp.difficulty]}</span>
        {kp.estimatedMinutes && <span>约 {kp.estimatedMinutes} 分钟</span>}
        {total > 0 && <span>{total} 题</span>}
      </div>
    </Link>
  );
}
