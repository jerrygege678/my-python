// ── 账号相关 ──────────────────────────────────────────
import type { IconName } from "./components/Icon";

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface AuthState {
  status: "loading" | "authed" | "guest";
  user: User | null;
}

export interface Credentials {
  username: string;
  password: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// ── 课程数据 ──────────────────────────────────────────
export type KPType = "online" | "offline";
export type Difficulty = 1 | 2 | 3;

export interface NormalizeOptions {
  ignoreTrailingWhitespace?: boolean; // 默认 true
  ignoreTrailingBlankLines?: boolean; // 默认 true
  ignoreCase?: boolean; // 默认 false
  collapseSpaces?: boolean; // 默认 false
}

export interface FunctionCase {
  args: unknown[];
  expected: unknown;
  label?: string;
}

export type JudgeConfig =
  | {
      type: "output";
      expectedOutput: string;
      normalize?: NormalizeOptions;
      allowLiteralPrint?: boolean;
    }
  | { type: "assert"; testCode: string }
  | {
      type: "function";
      functionName: string;
      cases: FunctionCase[];
      floatTolerance?: number;
    };

export interface Question {
  id: string;
  title: string;
  description: string;
  input?: string;
  hint?: string;
  difficulty: Difficulty;
  starterCode?: string;
  answer: string;
  explanation?: string;
  requires?: string[]; // Pyodide 包名，如 ["numpy"] / ["scikit-learn"]
  judge: JudgeConfig;
}

/* 外部工具 / 操作步骤：真实数据用的是「字符串」简写形态，
   但类型上必须同时兼容富对象形态，渲染层两种都要支持 */
export type OfflineTool =
  | string
  | { name: string; desc?: string; url?: string; install?: string };

export type OfflineStep =
  | string
  | { title: string; detail?: string; commands?: string[]; expected?: string };

export interface KnowledgePoint {
  id: string;
  type: KPType;
  title: string;
  category: string;
  order: number;
  difficulty: Difficulty;
  estimatedMinutes?: number;
  tags?: string[];
  summary: string;
  intro: string;
  scenarios: string[];
  questions?: Question[]; // online：恰好 3 道
  whyOffline?: string; // offline
  tools?: OfflineTool[];
  steps?: OfflineStep[];
  successCriteria?: string[];
  pitfalls?: string[];
  references?: { title: string; url: string }[];
}

export interface Category {
  id: string;
  name: string;
  type: KPType;
  icon?: IconName;
  order: number;
}

export interface Curriculum {
  version: string;
  categories: Category[];
  knowledgePoints: KnowledgePoint[];
}

// ── 进度模型 ──────────────────────────────────────────
export interface QuestionProgress {
  status: "todo" | "passed";
  attempts: number;
  passedAt?: string;
  lastCode?: string; // 自动保存的草稿
  usedAnswer?: boolean;
}

export interface ProgressState {
  version: 2; // ★ v3.0 起为 2
  userId: number; // ★ 所属用户（本地缓存校验用）
  questions: Record<string, QuestionProgress>; // key = `${kpId}::${questionId}`
  offline: Record<string, { done: boolean; doneAt?: string }>;
  offlineChecks: Record<string, boolean>; // key = `${kpId}::${index}`
  updatedAt: string;
}
