import { Link } from "react-router-dom";
import { getOnlineKps, getOfflineKps, getStats, getCategoryById } from "../data";
import { useProgress } from "../store/ProgressContext";
import { useAuth } from "../store/AuthContext";
import ProgressBar from "../components/ProgressBar";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";

export default function ProgressPage() {
  const { user } = useAuth();
  const { progress, isQuestionPassed, isKpCompleted, isOfflineDone } =
    useProgress();
  const stats = getStats();
  const onlineKps = getOnlineKps();
  const offlineKps = getOfflineKps();

  const passedQuestions = progress
    ? Object.values(progress.questions).filter((q) => q.status === "passed")
        .length
    : 0;
  const completedOnline = onlineKps.filter((kp) =>
    isKpCompleted(kp.id, kp.questions?.length ?? 0)
  ).length;
  const completedOffline = offlineKps.filter((kp) => isOfflineDone(kp.id))
    .length;
  const usedAnswers = progress
    ? Object.values(progress.questions).filter((q) => q.usedAnswer).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">我的进度</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user?.username} 的学习记录 · 云端同步
        </p>
      </div>

      {/* 总览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="已通过题目" value={passedQuestions} total={stats.totalQuestionCount} />
        <StatCard label="完成在线知识点" value={completedOnline} total={stats.onlineKpCount} />
        <StatCard label="完成实操知识点" value={completedOffline} total={stats.offlineKpCount} />
        <StatCard label="查看答案次数" value={usedAnswers} total={undefined} />
      </div>

      {/* 在线进度明细 */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          在线验证区进度
        </h2>
        <div className="space-y-2">
          {onlineKps.map((kp) => {
            const total = kp.questions?.length ?? 0;
            const passed = kp.questions
              ? kp.questions.filter((q) => isQuestionPassed(kp.id, q.id)).length
              : 0;
            const cat = getCategoryById(kp.category);
            const completed = isKpCompleted(kp.id, total);
            return (
              <Link
                key={kp.id}
                to={`/online/${kp.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
              >
                {cat?.icon && (
                  <Icon name={cat.icon} size={18} className="text-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {kp.title}
                  </p>
                  <div className="mt-1">
                    <ProgressBar value={passed} max={total} showText={false} />
                  </div>
                </div>
                <StatusBadge variant={completed ? "passed" : passed > 0 ? "progress" : "todo"} />
                <span className="text-xs text-slate-400 tabular-nums">
                  {passed}/{total}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 离线进度明细 */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          外部实操区进度
        </h2>
        <div className="space-y-2">
          {offlineKps.map((kp) => {
            const cat = getCategoryById(kp.category);
            const done = isOfflineDone(kp.id);
            const total = kp.successCriteria?.length ?? 0;
            const checked = total
              ? kp.successCriteria!.filter((_, i) =>
                  progress?.offlineChecks[`${kp.id}::${i}`]
                ).length
              : 0;
            return (
              <Link
                key={kp.id}
                to={`/offline/${kp.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
              >
                {cat?.icon && (
                  <Icon name={cat.icon} size={18} className="text-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {kp.title}
                  </p>
                  {total > 0 && (
                    <p className="text-xs text-slate-400">
                      自检 {checked}/{total}
                    </p>
                  )}
                </div>
                <StatusBadge variant={done ? "passed" : "todo"}>
                  {done ? "已完成" : "未完成"}
                </StatusBadge>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total?: number;
}) {
  return (
    <div className="panel p-4 text-center">
      <p className="text-2xl font-bold text-primary tabular-nums">
        {value}
        {total !== undefined && (
          <span className="text-sm text-slate-400">/{total}</span>
        )}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
