import { useMemo, useState } from "react";
import { searchKps, getStats } from "../data";
import CategoryFilter from "../components/CategoryFilter";
import KpCard from "../components/KpCard";

export default function OnlineList() {
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const stats = getStats();

  const kps = useMemo(
    () => searchKps("online", keyword, categoryId ?? undefined),
    [keyword, categoryId]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">在线验证区</h1>
        <p className="text-sm text-slate-500 mt-1">
          {stats.onlineKpCount} 个知识点 · {stats.totalQuestionCount} 道题 ·
          浏览器内运行 + 自动判题
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

      <CategoryFilter type="online" selected={categoryId} onSelect={setCategoryId} />

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
