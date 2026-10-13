import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getKpById, getOnlineKps, getCategoryById } from "../data";
import { useProgress } from "../store/ProgressContext";
import { pyodideClient, type RunResult } from "../runtime/pyodideClient";
import { judge, type JudgeOutcome } from "../runtime/judge";
import Breadcrumb from "../components/Breadcrumb";
import CodeEditor from "../components/CodeEditor";
import RunButton from "../components/RunButton";
import OutputPanel from "../components/OutputPanel";
import AnswerPanel from "../components/AnswerPanel";
import HintCard from "../components/HintCard";
import Icon from "../components/Icon";
import QuestionStepper from "../components/QuestionStepper";
import ConfirmDialog from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import Markdown from "../components/Markdown";
import type { Question } from "../types";

const diffLabels: Record<number, string> = { 1: "入门", 2: "中等", 3: "进阶" };

export default function OnlineDetail() {
  const { kpId = "" } = useParams();
  const navigate = useNavigate();
  const {
    getQuestionProgress,
    isQuestionPassed,
    isKpCompleted,
    markPassed,
    recordAttempt,
    saveDraft,
    setUsedAnswer,
  } = useProgress();

  const kp = getKpById(kpId);
  const questions = kp?.questions ?? [];
  const cat = kp ? getCategoryById(kp.category) : undefined;

  // 当前题目索引
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentQuestion = questions[currentIdx];

  // 编辑器代码
  const [code, setCode] = useState("");

  // 运行 / 判题状态
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [outcome, setOutcome] = useState<JudgeOutcome | null>(null);
  const [pyodideStatus, setPyodideStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [pyodideMsg, setPyodideMsg] = useState("");
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const pyodideReadyRef = useRef(false);

  // 标记已掌握
  const [confirmMaster, setConfirmMaster] = useState(false);

  // 通过的题目 id 集合（用于 stepper 解锁判断）
  const passedSet = useMemo(
    () =>
      new Set(
        questions
          .filter((q) => isQuestionPassed(kpId, q.id))
          .map((q) => q.id)
      ),
    [questions, kpId, isQuestionPassed]
  );

  // 题目变化时恢复草稿
  // DECISION: 不能在此 effect 里重置 runResult/outcome！
  // getQuestionProgress 依赖 progress，而 handleRun 里调 markPassed/recordAttempt
  // 会触发 progress 变化 → getQuestionProgress 引用更新 → effect 重跑 →
  // 把刚 setRunResult/setOutcome 设好的结果清空，OutputPanel 永远显示占位文字。
  // 拆成两个 effect：本 effect 只恢复草稿代码，结果清空放到只依赖题目 id 的 effect。
  useEffect(() => {
    if (!currentQuestion) return;
    const prog = getQuestionProgress(kpId, currentQuestion.id);
    setCode(prog?.lastCode ?? currentQuestion.starterCode ?? "");
  }, [currentQuestion, kpId, getQuestionProgress]);

  // 仅在题目切换时清空运行结果（不依赖 progress，避免上述竞态）
  useEffect(() => {
    setRunResult(null);
    setOutcome(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  // 草稿自动保存：debounce 300ms（PRD §8.7）
  useEffect(() => {
    if (!currentQuestion || !code) return;
    const t = window.setTimeout(() => {
      saveDraft(kpId, currentQuestion.id, code);
    }, 300);
    return () => clearTimeout(t);
  }, [code, currentQuestion, kpId, saveDraft]);

  // 订阅 pyodide 包加载进度
  useEffect(() => {
    const unsub = pyodideClient.onProgress((msg) => setPyodideMsg(msg));
    return unsub;
  }, []);

  if (!kp || kp.type !== "online" || !currentQuestion) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-400">知识点不存在</p>
        <Link to="/online" className="btn-primary mt-4 inline-flex">
          返回列表
        </Link>
      </div>
    );
  }

  const allPassed = isKpCompleted(kpId, questions.length);

  const handleRun = async () => {
    setRunning(true);
    setOutcome(null);
    setRunResult(null);
    // DECISION: 每次运行前重置 error 状态，允许重试（之前 init 失败后按钮永久禁用）
    setPyodideError(null);
    if (pyodideStatus === "error") {
      setPyodideStatus("idle");
      pyodideReadyRef.current = false;
    }
    try {
      if (!pyodideReadyRef.current) {
        setPyodideStatus("loading");
        await pyodideClient.init();
        pyodideReadyRef.current = true;
        setPyodideStatus("ready");
      }
      const result = await pyodideClient.run(
        code,
        currentQuestion.requires ?? [],
        5000
      );
      setRunResult(result);

      // DECISION: 超时/运行错误也必须渲染 outcome 卡片，
      // 否则 OutputPanel 只显示空状态，用户看不到任何反馈
      if (result.timedOut) {
        recordAttempt(kpId, currentQuestion.id, code);
        setOutcome({
          passed: false,
          message: result.error ?? "运行超时，已自动终止",
          detail: "检查代码是否存在死循环或递归调用未设终止条件。",
        });
        return;
      }
      if (!result.ok) {
        recordAttempt(kpId, currentQuestion.id, code);
        setOutcome({
          passed: false,
          message: result.error ?? "运行错误",
          detail: result.stderr || result.stdout || undefined,
        });
        return;
      }
      const oc = await judge(currentQuestion, result, code);
      setOutcome(oc);
      if (oc.passed) {
        markPassed(kpId, currentQuestion.id, code);
        // 通过后约 1.2s 自动切下一题（PRD §8.4）
        window.setTimeout(() => {
          if (currentIdx < questions.length - 1) {
            setCurrentIdx((i) => i + 1);
          }
        }, 1200);
      } else {
        recordAttempt(kpId, currentQuestion.id, code);
      }
    } catch (e) {
      // DECISION: init/run 失败时渲染错误到 OutputPanel（不只是禁用按钮）
      // 之前只设 pyodideError 但按钮 disabled，用户无法看到原因也无法重试
      setPyodideStatus("error");
      const msg = String((e as Error)?.message ?? e);
      setPyodideError(msg);
      setOutcome({
        passed: false,
        message: "运行环境错误",
        detail: msg,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleMaster = () => {
    setConfirmMaster(false);
    for (const q of questions) {
      if (!isQuestionPassed(kpId, q.id)) {
        markPassed(kpId, q.id, q.starterCode ?? "");
      }
    }
  };

  const handleRevealAnswer = () => {
    setUsedAnswer(kpId, currentQuestion.id);
  };

  // 下一知识点
  const onlineKps = getOnlineKps();
  const idx = onlineKps.findIndex((k) => k.id === kpId);
  const nextKp = idx >= 0 && idx < onlineKps.length - 1 ? onlineKps[idx + 1] : null;

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: "在线验证", to: "/online" },
          { label: kp.title },
        ]}
      />

      {/* 知识点头部 */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              {cat?.icon && <Icon name={cat.icon} size={14} className="text-primary" />}
              <span>{cat?.name}</span>
              <span>·</span>
              <span>{diffLabels[kp.difficulty]}</span>
              {kp.estimatedMinutes && <span>· 约 {kp.estimatedMinutes} 分钟</span>}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{kp.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{kp.summary}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {allPassed && <StatusBadge variant="passed" />}
            <button
              className="btn-ghost text-xs"
              onClick={() => setConfirmMaster(true)}
            >
              标记已掌握
            </button>
          </div>
        </div>
        <div className="mt-4 prose-sm">
          <Markdown content={kp.intro} />
        </div>
        {kp.scenarios.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 mb-1">使用场景</p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              {kp.scenarios.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 题目步骤条 */}
      <div className="card p-3 flex items-center justify-between">
        <QuestionStepper
          questions={questions}
          current={currentIdx}
          passedSet={passedSet}
          onSelect={setCurrentIdx}
        />
        {allPassed && nextKp && (
          <Link
            to={`/online/${nextKp.id}`}
            className="btn-accent text-xs whitespace-nowrap"
          >
            下一知识点 →
          </Link>
        )}
      </div>

      {/* 当前题目 */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900">
              第 {currentIdx + 1} 题：{currentQuestion.title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {currentQuestion.description}
            </p>
            {currentQuestion.input && (
              <p className="text-xs text-slate-400 mt-1">
                输入：{currentQuestion.input}
              </p>
            )}
          </div>
          {isQuestionPassed(kpId, currentQuestion.id) && (
            <StatusBadge variant="passed" />
          )}
        </div>
      </div>

      {/* 编辑器 + 输出 */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="panel flex flex-col h-[420px] overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">代码</span>
            {currentQuestion.requires && currentQuestion.requires.length > 0 && (
              <span className="text-xs text-slate-400">
                依赖：{currentQuestion.requires.join(", ")}
              </span>
            )}
          </div>
          <div className="flex-1">
            <CodeEditor value={code} onChange={setCode} />
          </div>
          <div className="px-3 py-2 border-t border-slate-200 flex items-center gap-2">
            <RunButton
              onClick={handleRun}
              loading={running || pyodideStatus === "loading"}
              disabled={false}
              loadingLabel={
                pyodideStatus === "loading"
                  ? pyodideMsg || "正在加载运行环境…"
                  : "运行中…"
              }
            />
            {pyodideStatus === "error" && (
              <button
                className="btn-ghost text-xs"
                onClick={() => {
                  setPyodideStatus("idle");
                  setPyodideError(null);
                  pyodideReadyRef.current = false;
                }}
              >
                重试加载
              </button>
            )}
          </div>
        </div>
        <div className="h-[420px]">
          <OutputPanel
            running={running}
            result={runResult}
            outcome={outcome}
            pyodideLoading={pyodideStatus === "loading"}
            pyodideError={pyodideError}
          />
        </div>
      </div>

      {/* 提示 + 答案 */}
      <div className="grid sm:grid-cols-2 gap-3">
        {currentQuestion.hint && <HintCard hint={currentQuestion.hint} />}
        <AnswerPanel
          answer={currentQuestion.answer}
          explanation={currentQuestion.explanation}
          onReveal={handleRevealAnswer}
        />
      </div>

      {/* 全通过提示 */}
      {allPassed && (
        <div className="card p-5 bg-success/5 border-success/30 text-center">
          <p className="text-success font-medium flex items-center justify-center gap-1.5">
            <Icon name="trophy" size={18} />
            本知识点已完成！
          </p>
          {nextKp ? (
            <Link
              to={`/online/${nextKp.id}`}
              className="btn-primary mt-3 inline-flex"
            >
              继续下一知识点 →
            </Link>
          ) : (
            <Link to="/online" className="btn-primary mt-3 inline-flex">
              返回知识点列表
            </Link>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmMaster}
        title="标记为已掌握？"
        message="确认后本知识点的 3 道题将全部标记为通过，你无需再逐题作答。"
        confirmText="确认标记"
        onConfirm={handleMaster}
        onCancel={() => setConfirmMaster(false)}
      />
    </div>
  );
}
