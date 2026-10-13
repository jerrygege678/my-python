import { Link } from "react-router-dom";
import { getStats, getOnlineKps, getOfflineKps } from "../data";
import { useProgress } from "../store/ProgressContext";
import { useAuth } from "../store/AuthContext";
import ProgressBar from "../components/ProgressBar";
import Icon, { type IconName } from "../components/Icon";

export default function Home() {
  const { user } = useAuth();
  const { progress, isKpCompleted } = useProgress();
  const stats = getStats();

  const onlineKps = getOnlineKps();
  const offlineKps = getOfflineKps();
  const onlineDone = onlineKps.filter((kp) =>
    isKpCompleted(kp.id, kp.questions?.length ?? 0)
  ).length;
  const offlineDone = offlineKps.filter((kp) =>
    progress?.offline[kp.id]?.done
  ).length;

  const passedQuestions = progress
    ? Object.values(progress.questions).filter((q) => q.status === "passed")
        .length
    : 0;

  const totalDone = onlineDone + offlineDone;
  const totalPct =
    stats.totalKpCount > 0
      ? Math.round((totalDone / stats.totalKpCount) * 100)
      : 0;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-card border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary/5 px-6 py-10 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Icon name="graduationCap" size={14} strokeWidth={2} />
            Python 闯关实验室
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            欢迎回来，{user?.username}
          </h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            闯关式 Python 学习。代码在浏览器内运行，进度云端同步，循序渐进解锁知识点。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/online" className="btn-primary group">
              开始闯关
              <Icon
                name="arrowRight"
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link to="/progress" className="btn-ghost">
              <Icon name="trendingUp" size={16} />
              查看进度
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
            <Icon name="check" size={16} className="text-accent" strokeWidth={2.25} />
            已完成 {totalDone} / {stats.totalKpCount} 知识点
            <span className="mx-1 text-slate-300">·</span>
            <span className="font-medium text-ink tabular-nums">{totalPct}%</span>
          </div>
        </div>
      </section>

      {/* 双入口卡片 */}
      <section className="grid gap-4 md:grid-cols-2">
        <EntryCard
          to="/online"
          icon="flask"
          iconClass="text-primary bg-primary/10"
          title="在线验证区"
          desc="知识点讲解 + 浏览器内运行代码 + 自动判题 + 通关解锁"
          value={onlineDone}
          max={stats.onlineKpCount}
        />
        <EntryCard
          to="/offline"
          icon="terminal"
          iconClass="text-mastered bg-mastered/10"
          title="外部实操区"
          desc="本地环境实操知识点 + 工具说明 + 操作步骤 + 成功标准"
          value={offlineDone}
          max={stats.offlineKpCount}
        />
      </section>

      {/* 进度概览 */}
      <section className="card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Icon name="trendingUp" size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold text-ink">学习概览</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            icon="check"
            value={`${passedQuestions}`}
            sub={`/ ${stats.totalQuestionCount}`}
            label="已通过题目"
          />
          <Stat
            icon="layers"
            value={`${totalDone}`}
            sub={`/ ${stats.totalKpCount}`}
            label="完成知识点"
          />
          <Stat
            icon="flask"
            value={`${stats.onlineKpCount}`}
            sub="个"
            label="在线知识点"
          />
          <Stat
            icon="terminal"
            value={`${stats.offlineKpCount}`}
            sub="个"
            label="离线知识点"
          />
        </div>
      </section>

      {/* 特性 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Feature
          icon="bolt"
          title="浏览器即运行"
          desc="无需配置环境，打开即写即跑"
        />
        <Feature
          icon="graduationCap"
          title="闯关式学习"
          desc="由浅入深，循序渐进解锁"
        />
        <Feature
          icon="cloud"
          title="进度云端同步"
          desc="多设备续学，数据不丢"
        />
        <Feature
          icon="shieldCheck"
          title="防蒙混校验"
          desc="自动判题，鼓励真实实现"
        />
      </section>
    </div>
  );
}

function EntryCard({
  to,
  icon,
  iconClass,
  title,
  desc,
  value,
  max,
}: {
  to: string;
  icon: IconName;
  iconClass: string;
  title: string;
  desc: string;
  value: number;
  max: number;
}) {
  return (
    <Link
      to={to}
      className="group card relative flex flex-col p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon name={icon} size={22} strokeWidth={1.75} />
        </span>
        <Icon
          name="arrowRight"
          size={18}
          className="text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{desc}</p>
      <div className="mt-5">
        <ProgressBar value={value} max={max} />
      </div>
    </Link>
  );
}

function Stat({
  icon,
  value,
  sub,
  label,
}: {
  icon: IconName;
  value: string;
  sub?: string;
  label: string;
}) {
  return (
    <div className="panel p-4">
      <Icon name={icon} size={18} className="text-slate-400" strokeWidth={1.75} />
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
        {value}
        {sub && <span className="ml-1 text-sm font-normal text-slate-400">{sub}</span>}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: IconName;
  title: string;
  desc: string;
}) {
  return (
    <div className="card p-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name={icon} size={18} strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}
