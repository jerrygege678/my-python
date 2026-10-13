import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getKpById, getCategoryById, getOfflineKps } from "../data";
import { useProgress } from "../store/ProgressContext";
import Breadcrumb from "../components/Breadcrumb";
import Markdown from "../components/Markdown";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import type { OfflineTool, OfflineStep } from "../types";

const diffLabels: Record<number, string> = { 1: "入门", 2: "中等", 3: "进阶" };

/** 行内代码高亮：把反引号包裹的片段渲染成 code */
function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={i}
              className="bg-slate-100 text-primary px-1 py-0.5 rounded text-xs font-mono"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={copy}
      className="text-xs text-slate-400 hover:text-primary"
      title="复制"
    >
      {copied ? "✓ 已复制" : "📋 复制"}
    </button>
  );
}

function ToolCard({ tool }: { tool: OfflineTool }) {
  if (typeof tool === "string") {
    return (
      <div className="panel p-3">
        <p className="text-sm font-medium text-slate-800">
          <InlineCode text={tool} />
        </p>
      </div>
    );
  }
  return (
    <div className="panel p-3 space-y-1.5">
      <p className="text-sm font-medium text-slate-900">{tool.name}</p>
      {tool.desc && <p className="text-xs text-slate-500">{tool.desc}</p>}
      {tool.url && (
        <a
          href={tool.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline"
        >
          {tool.url}
        </a>
      )}
      {tool.install && (
        <div className="flex items-center justify-between gap-2 bg-slate-50 rounded px-2 py-1">
          <code className="text-xs font-mono text-slate-700 break-all">
            {tool.install}
          </code>
          <CopyButton text={tool.install} />
        </div>
      )}
    </div>
  );
}

function StepItem({ step, index }: { step: OfflineStep; index: number }) {
  if (typeof step === "string") {
    return (
      <li className="text-sm text-slate-600">
        <InlineCode text={step} />
      </li>
    );
  }
  return (
    <li className="space-y-1">
      <p className="text-sm font-medium text-slate-900">
        {index + 1}. {step.title}
      </p>
      {step.detail && <p className="text-xs text-slate-500">{step.detail}</p>}
      {step.commands && step.commands.length > 0 && (
        <div className="space-y-1">
          {step.commands.map((cmd, ci) => (
            <div
              key={ci}
              className="flex items-center justify-between gap-2 bg-slate-50 rounded px-2 py-1"
            >
              <code className="text-xs font-mono text-slate-700 break-all">
                {cmd}
              </code>
              <CopyButton text={cmd} />
            </div>
          ))}
        </div>
      )}
      {step.expected && (
        <p className="text-xs text-success">预期：{step.expected}</p>
      )}
    </li>
  );
}

export default function OfflineDetail() {
  const { kpId = "" } = useParams();
  const {
    isOfflineDone,
    getOfflineCheck,
    toggleOfflineCheck,
    markOfflineDone,
  } = useProgress();

  const kp = getKpById(kpId);
  const cat = kp ? getCategoryById(kp.category) : undefined;

  const [confirmDone, setConfirmDone] = useState(false);
  const [warnNotAll, setWarnNotAll] = useState(false);

  if (!kp || kp.type !== "offline") {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-400">知识点不存在</p>
        <Link to="/offline" className="btn-primary mt-4 inline-flex">
          返回列表
        </Link>
      </div>
    );
  }

  const done = isOfflineDone(kpId);
  const criteria = kp.successCriteria ?? [];
  const checkedCount = criteria.filter((_, i) => getOfflineCheck(kpId, i))
    .length;
  const allChecked = checkedCount === criteria.length && criteria.length > 0;

  const handleDoneToggle = () => {
    setConfirmDone(false);
    setWarnNotAll(false);
    if (done) {
      markOfflineDone(kpId, false);
    } else if (!allChecked) {
      setWarnNotAll(true);
    } else {
      markOfflineDone(kpId, true);
    }
  };

  const offlineKps = getOfflineKps();
  const idx = offlineKps.findIndex((k) => k.id === kpId);
  const nextKp =
    idx >= 0 && idx < offlineKps.length - 1 ? offlineKps[idx + 1] : null;

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: "外部实操", to: "/offline" },
          { label: kp.title },
        ]}
      />

      {/* 头部 */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              {cat?.icon && <Icon name={cat.icon} size={14} className="text-primary" />}
              <span>{cat?.name}</span>
              <span>·</span>
              <span>{diffLabels[kp.difficulty]}</span>
              {kp.estimatedMinutes && (
                <span>· 约 {kp.estimatedMinutes} 分钟</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{kp.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{kp.summary}</p>
          </div>
          {done && <StatusBadge variant="passed">已完成</StatusBadge>}
        </div>
        <div className="mt-4">
          <Markdown content={kp.intro} />
        </div>
      </div>

      {/* 为什么不能在线验证 */}
      {kp.whyOffline && (
        <div className="card p-5 bg-amber-50 border-amber-200">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            为什么不能在线验证？
          </h2>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {kp.whyOffline}
          </p>
        </div>
      )}

      {/* 使用场景 */}
      {kp.scenarios.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            使用场景
          </h2>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            {kp.scenarios.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 外部工具 */}
      {kp.tools && kp.tools.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            外部工具
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {kp.tools.map((t, i) => (
              <ToolCard key={i} tool={t} />
            ))}
          </div>
        </div>
      )}

      {/* 操作步骤 */}
      {kp.steps && kp.steps.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            操作步骤
          </h2>
          <ol className="space-y-3 list-decimal list-inside">
            {kp.steps.map((s, i) => (
              <StepItem key={i} step={s} index={i} />
            ))}
          </ol>
        </div>
      )}

      {/* 成功标准 */}
      {criteria.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            成功标准（自检）
          </h2>
          <div className="space-y-2">
            {criteria.map((c, i) => (
              <label
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={getOfflineCheck(kpId, i)}
                  onChange={() => toggleOfflineCheck(kpId, i)}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              已勾选 {checkedCount}/{criteria.length}
            </span>
            <button
              className={done ? "btn-danger" : "btn-primary"}
              onClick={() => setConfirmDone(true)}
            >
              {done ? "取消完成" : "我已完成"}
            </button>
          </div>
          {warnNotAll && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700">
                还有 {criteria.length - checkedCount} 项未勾选，确认完成吗？
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setWarnNotAll(false)}
                >
                  再检查
                </button>
                <button
                  className="btn-primary text-xs"
                  onClick={() => {
                    setWarnNotAll(false);
                    markOfflineDone(kpId, true);
                  }}
                >
                  确认完成
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 注意事项 */}
      {kp.pitfalls && kp.pitfalls.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            注意事项
          </h2>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            {kp.pitfalls.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 参考资料 */}
      {kp.references && kp.references.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            参考资料
          </h2>
          <ul className="text-sm space-y-1">
            {kp.references.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 下一知识点 */}
      {done && nextKp && (
        <div className="card p-5 bg-success/5 border-success/30 text-center">
          <p className="text-success font-medium flex items-center justify-center gap-1.5">
            <Icon name="trophy" size={18} />
            本知识点已完成！
          </p>
          <Link
            to={`/offline/${nextKp.id}`}
            className="btn-primary mt-3 inline-flex"
          >
            继续下一知识点 →
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirmDone}
        title={done ? "取消完成标记？" : "确认完成本知识点？"}
        message={
          done
            ? "取消后该知识点的完成状态将被清除。"
            : undefined
        }
        confirmText={done ? "取消完成" : "确认"}
        danger={done}
        onConfirm={handleDoneToggle}
        onCancel={() => setConfirmDone(false)}
      />
    </div>
  );
}
