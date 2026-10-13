import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProgressState, QuestionProgress } from "../types";
import { fetchProgress, saveProgress } from "../api/progress";
import { useAuth, progressKeyFor } from "./AuthContext";

// ── 工具 ─────────────────────────────────────────────
export function emptyProgress(userId: number): ProgressState {
  return {
    version: 2,
    userId,
    questions: {},
    offline: {},
    offlineChecks: {},
    updatedAt: new Date().toISOString(),
  };
}

function qKey(kpId: string, qId: string): string {
  return `${kpId}::${qId}`;
}

/**
 * 合并本地与服务端进度（PRD §6 / §8.7）：
 * - 通过状态取并集（只前进不后退）
 * - attempts 取 max
 * - lastCode 草稿取本地
 */
function mergeProgress(
  local: ProgressState,
  server: ProgressState
): ProgressState {
  const merged: ProgressState = {
    version: 2,
    userId: local.userId,
    questions: {},
    offline: {},
    offlineChecks: {},
    updatedAt: server.updatedAt,
  };

  const allQ = new Set([
    ...Object.keys(local.questions),
    ...Object.keys(server.questions),
  ]);
  for (const k of allQ) {
    const l = local.questions[k];
    const s = server.questions[k];
    if (!l) {
      merged.questions[k] = { ...s! };
      continue;
    }
    if (!s) {
      merged.questions[k] = { ...l };
      continue;
    }
    const passed = l.status === "passed" || s.status === "passed";
    merged.questions[k] = {
      status: passed ? "passed" : "todo",
      attempts: Math.max(l.attempts, s.attempts),
      passedAt: l.passedAt ?? s.passedAt,
      lastCode: l.lastCode ?? s.lastCode,
      usedAnswer: l.usedAnswer ?? s.usedAnswer,
    };
  }

  const allOff = new Set([
    ...Object.keys(local.offline),
    ...Object.keys(server.offline),
  ]);
  for (const k of allOff) {
    const l = local.offline[k];
    const s = server.offline[k];
    if (!l) {
      merged.offline[k] = { ...s! };
      continue;
    }
    if (!s) {
      merged.offline[k] = { ...l };
      continue;
    }
    merged.offline[k] = {
      done: l.done || s.done,
      doneAt: l.doneAt ?? s.doneAt,
    };
  }

  const allChk = new Set([
    ...Object.keys(local.offlineChecks),
    ...Object.keys(server.offlineChecks),
  ]);
  for (const k of allChk) {
    merged.offlineChecks[k] = !!(
      local.offlineChecks[k] || server.offlineChecks[k]
    );
  }

  return merged;
}

function loadLocal(userId: number): ProgressState {
  try {
    const raw = localStorage.getItem(progressKeyFor(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState;
      if (parsed && parsed.version === 2) {
        return { ...parsed, userId };
      }
    }
  } catch {
    /* 损坏的 JSON → 用空骨架（PRD：页面不白屏） */
  }
  return emptyProgress(userId);
}

// ── Reducer ──────────────────────────────────────────
type Action =
  | { type: "SET"; progress: ProgressState }
  | { type: "CLEAR" }
  | { type: "MARK_PASSED"; key: string; code: string }
  | { type: "INC_ATTEMPT"; key: string; code: string }
  | { type: "SET_LASTCODE"; key: string; code: string }
  | { type: "SET_USED_ANSWER"; key: string }
  | { type: "TOGGLE_OFFLINE_CHECK"; key: string }
  | { type: "MARK_OFFLINE_DONE"; kpId: string; done: boolean };

function reducer(state: ProgressState | null, action: Action): ProgressState | null {
  if (action.type === "CLEAR") return null;
  // DECISION: SET 必须先于 null 守卫——否则首次登录后 state 为 null，
  // 服务端合并结果会被永远丢弃，进度功能整体失效
  if (action.type === "SET") return action.progress;
  if (!state) return null;
  const now = new Date().toISOString();
  switch (action.type) {
    case "MARK_PASSED": {
      const prev = state.questions[action.key];
      const next: QuestionProgress = {
        status: "passed",
        attempts: (prev?.attempts ?? 0) + 1,
        passedAt: now,
        lastCode: action.code,
        usedAnswer: prev?.usedAnswer,
      };
      return {
        ...state,
        questions: { ...state.questions, [action.key]: next },
        updatedAt: now,
      };
    }
    case "INC_ATTEMPT": {
      const prev = state.questions[action.key];
      const next: QuestionProgress = {
        status: "todo",
        attempts: (prev?.attempts ?? 0) + 1,
        passedAt: prev?.passedAt,
        lastCode: action.code,
        usedAnswer: prev?.usedAnswer,
      };
      return {
        ...state,
        questions: { ...state.questions, [action.key]: next },
        updatedAt: now,
      };
    }
    case "SET_LASTCODE": {
      const prev = state.questions[action.key];
      const next: QuestionProgress = {
        status: prev?.status ?? "todo",
        attempts: prev?.attempts ?? 0,
        passedAt: prev?.passedAt,
        lastCode: action.code,
        usedAnswer: prev?.usedAnswer,
      };
      return {
        ...state,
        questions: { ...state.questions, [action.key]: next },
        updatedAt: now,
      };
    }
    case "SET_USED_ANSWER": {
      const prev = state.questions[action.key] ?? {
        status: "todo" as const,
        attempts: 0,
      };
      return {
        ...state,
        questions: {
          ...state.questions,
          [action.key]: { ...prev, usedAnswer: true },
        },
        updatedAt: now,
      };
    }
    case "TOGGLE_OFFLINE_CHECK": {
      const cur = !!state.offlineChecks[action.key];
      return {
        ...state,
        offlineChecks: { ...state.offlineChecks, [action.key]: !cur },
        updatedAt: now,
      };
    }
    case "MARK_OFFLINE_DONE": {
      const cur = state.offline[action.kpId];
      return {
        ...state,
        offline: {
          ...state.offline,
          [action.kpId]: {
            done: action.done,
            doneAt: action.done ? now : cur?.doneAt,
          },
        },
        updatedAt: now,
      };
    }
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────
export type SyncStatus = "idle" | "syncing" | "offline";

interface ProgressContextValue {
  progress: ProgressState | null;
  syncStatus: SyncStatus;
  markPassed: (kpId: string, qId: string, code: string) => void;
  recordAttempt: (kpId: string, qId: string, code: string) => void;
  saveDraft: (kpId: string, qId: string, code: string) => void;
  setUsedAnswer: (kpId: string, qId: string) => void;
  toggleOfflineCheck: (kpId: string, index: number) => void;
  markOfflineDone: (kpId: string, done: boolean) => void;
  retrySync: () => void;
  getQuestionProgress: (kpId: string, qId: string) => QuestionProgress | undefined;
  isQuestionPassed: (kpId: string, qId: string) => boolean;
  isKpCompleted: (kpId: string, totalQuestions: number) => boolean;
  isOfflineDone: (kpId: string) => boolean;
  getOfflineCheck: (kpId: string, index: number) => boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [progress, dispatch] = useReducer(reducer, null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  const progressRef = useRef<ProgressState | null>(null);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const skipSaveRef = useRef(false);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // 用户变化时：本地缓存 → GET 服务端 → 合并
  useEffect(() => {
    if (!user) {
      dispatch({ type: "CLEAR" });
      loadedRef.current = false;
      setSyncStatus("idle");
      return;
    }
    loadedRef.current = false;
    const local = loadLocal(user.id);
    fetchProgress().then((res) => {
      if (!user) return; // 登出竞态
      if (res.ok) {
        const server = { ...res.data.progress, userId: user.id };
        const merged = mergeProgress(local, server);
        skipSaveRef.current = true;
        dispatch({ type: "SET", progress: merged });
        try {
          localStorage.setItem(
            progressKeyFor(user.id),
            JSON.stringify(merged)
          );
        } catch {
          /* ignore quota */
        }
        setSyncStatus("idle");
        dirtyRef.current = false;
      } else {
        skipSaveRef.current = true;
        dispatch({ type: "SET", progress: local });
        setSyncStatus("offline");
        dirtyRef.current = true;
      }
      loadedRef.current = true;
    });
  }, [user]);

  // 进度变化 → debounce 写本地(1000ms) + PUT 云端(1500ms)
  useEffect(() => {
    if (!loadedRef.current || !progress) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const t1 = window.setTimeout(() => {
      try {
        localStorage.setItem(
          progressKeyFor(progress.userId),
          JSON.stringify(progress)
        );
      } catch {
        /* ignore */
      }
    }, 1000);

    const t2 = window.setTimeout(() => {
      setSyncStatus("syncing");
      saveProgress(progress).then((res) => {
        if (res.ok) {
          setSyncStatus("idle");
          dirtyRef.current = false;
        } else {
          setSyncStatus("offline");
          dirtyRef.current = true;
        }
      });
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [progress]);

  const retrySync = useCallback(() => {
    const p = progressRef.current;
    if (!p) return;
    setSyncStatus("syncing");
    saveProgress(p).then((res) => {
      if (res.ok) {
        setSyncStatus("idle");
        dirtyRef.current = false;
      } else {
        setSyncStatus("offline");
        dirtyRef.current = true;
      }
    });
  }, []);

  // 重试时机：online 事件 / 页面可见
  useEffect(() => {
    const onOnline = () => {
      if (dirtyRef.current) retrySync();
    };
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        dirtyRef.current
      ) {
        retrySync();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [retrySync]);

  // ── 操作方法 ────────────────────────────────────────
  const markPassed = useCallback(
    (kpId: string, qId: string, code: string) =>
      dispatch({ type: "MARK_PASSED", key: qKey(kpId, qId), code }),
    []
  );
  const recordAttempt = useCallback(
    (kpId: string, qId: string, code: string) =>
      dispatch({ type: "INC_ATTEMPT", key: qKey(kpId, qId), code }),
    []
  );
  const saveDraft = useCallback(
    (kpId: string, qId: string, code: string) =>
      dispatch({ type: "SET_LASTCODE", key: qKey(kpId, qId), code }),
    []
  );
  const setUsedAnswerFn = useCallback(
    (kpId: string, qId: string) =>
      dispatch({ type: "SET_USED_ANSWER", key: qKey(kpId, qId) }),
    []
  );
  const toggleOfflineCheck = useCallback(
    (kpId: string, index: number) =>
      dispatch({ type: "TOGGLE_OFFLINE_CHECK", key: `${kpId}::${index}` }),
    []
  );
  const markOfflineDone = useCallback(
    (kpId: string, done: boolean) =>
      dispatch({ type: "MARK_OFFLINE_DONE", kpId, done }),
    []
  );

  const getQuestionProgress = useCallback(
    (kpId: string, qId: string): QuestionProgress | undefined =>
      progress?.questions[qKey(kpId, qId)],
    [progress]
  );
  const isQuestionPassed = useCallback(
    (kpId: string, qId: string): boolean =>
      progress?.questions[qKey(kpId, qId)]?.status === "passed",
    [progress]
  );
  const isKpCompleted = useCallback(
    (kpId: string, totalQuestions: number): boolean => {
      if (!progress || totalQuestions === 0) return false;
      let passed = 0;
      for (let i = 1; i <= totalQuestions; i++) {
        // 题目 id 约定：q_001_1, q_001_2 ... 但更稳妥用 questions 数组长度+索引
        // 这里只做完成判定，调用方传 totalQuestions
      }
      // 通过扫描所有该 kp 的 key
      const prefix = `${kpId}::`;
      for (const k of Object.keys(progress.questions)) {
        if (k.startsWith(prefix) && progress.questions[k].status === "passed") {
          passed++;
        }
      }
      return passed >= totalQuestions;
    },
    [progress]
  );
  const isOfflineDone = useCallback(
    (kpId: string): boolean => !!progress?.offline[kpId]?.done,
    [progress]
  );
  const getOfflineCheck = useCallback(
    (kpId: string, index: number): boolean =>
      !!progress?.offlineChecks[`${kpId}::${index}`],
    [progress]
  );

  const value: ProgressContextValue = {
    progress,
    syncStatus,
    markPassed,
    recordAttempt,
    saveDraft,
    setUsedAnswer: setUsedAnswerFn,
    toggleOfflineCheck,
    markOfflineDone,
    retrySync,
    getQuestionProgress,
    isQuestionPassed,
    isKpCompleted,
    isOfflineDone,
    getOfflineCheck,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx)
    throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
