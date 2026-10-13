import { useMemo, useState } from "react";
import { searchKps, getStats } from "../data";
import { useProgress } from "../store/ProgressContext";
import CategoryFilter from "../components/CategoryFilter";
import KpCard from "../components/KpCard";

export default function OfflineList() {
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const stats = getStats();

  const kps = useMemo(
    () => searchKps("offline", keyword, categoryId ?? undefined),
    [keyword, categoryId]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">外部实操区</h1>
        <p className="text-sm text-slate-500 mt-1">
          {stats.offlineKpCount} 个知识点 · 需在本地环境操作 · 含工具说明与成功标准
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input h-10 flex-1"
          placeholder="搜索知识点标题或摘要…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <CategoryFilter
        type="offline"
        selected={categoryId}
        onSelect={setCategoryId}
      />

      {kps.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          没有匹配的知识点
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {kps.map((kp) => (
            <KpCard key={kp.id} kp={kp} />
          ))}
        </div>
      )}
    </div>
  );
}
