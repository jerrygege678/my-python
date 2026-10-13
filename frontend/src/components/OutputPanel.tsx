import type { RunResult } from "../runtime/pyodideClient";
import type { JudgeOutcome } from "../runtime/judge";

export default function OutputPanel({
  running,
  result,
  outcome,
  pyodideLoading,
  pyodideError,
}: {
  running: boolean;
  result: RunResult | null;
  outcome: JudgeOutcome | null;
  pyodideLoading?: boolean;
  pyodideError?: string | null;
}) {
  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">输出</span>
        {running && <span className="text-xs text-primary">正在运行…</span>}
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3 text-sm font-mono">
        {pyodideLoading && (
          <p className="text-slate-500">正在加载 Python 运行环境（约 5–15 秒）…</p>
        )}
        {pyodideError && (
          <p className="text-danger">运行环境加载失败：{pyodideError}</p>
        )}

        {result && !running && (
          <>
            {result.stdout && (
              <div>
                <p className="text-xs text-slate-400 mb-1">stdout</p>
                <pre className="whitespace-pre-wrap text-slate-800">
                  {result.stdout}
                </pre>
              </div>
            )}
            {result.stderr && (
              <div>
                <p className="text-xs text-slate-400 mb-1">stderr</p>
                <pre className="whitespace-pre-wrap text-danger">
                  {result.stderr}
                </pre>
              </div>
            )}
            {result.error && !result.stderr && (
              <pre className="whitespace-pre-wrap text-danger">
                {result.error}
              </pre>
            )}
          </>
        )}

        {outcome && (
          <div
            role="status"
            className={`rounded-lg p-3 ${
              outcome.passed
                ? "bg-success/10 border border-success/30"
                : "bg-danger/10 border border-danger/30"
            }`}
          >
            <p
              className={`font-medium ${
                outcome.passed ? "text-success" : "text-danger"
              }`}
            >
              {outcome.passed ? "✓ 通过" : "✗ 未通过"}
            </p>
            <p className="mt-1 text-slate-700 font-sans">{outcome.message}</p>
            {outcome.detail && (
              <pre className="mt-2 text-xs whitespace-pre-wrap text-slate-600 font-mono">
                {outcome.detail}
              </pre>
            )}
            {outcome.hint && (
              <p className="mt-2 text-xs text-slate-500 font-sans">
                💡 {outcome.hint}
              </p>
            )}
          </div>
        )}

        {!running && !result && !outcome && !pyodideLoading && !pyodideError && (
          <p className="text-slate-400">点击「运行」查看输出结果</p>
        )}
      </div>
    </div>
  );
}
