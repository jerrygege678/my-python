import type { Question, JudgeConfig } from "../types";
import type { RunResult } from "./pyodideClient";
import { normalize } from "../lib/normalize";
import { pyodideClient } from "./pyodideClient";

export interface JudgeOutcome {
  passed: boolean;
  message: string;
  detail?: string;
  hint?: string;
}

// ── 防蒙混校验（照抄 PRD §7.4）────────────────────────
const ENABLE_LITERAL_PRINT_GUARD = true;

function removeStrings(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < s.length) {
        if (s[i] === "\\") { i += 2; continue; }
        if (s[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function isLiteralArgList(inner: string): boolean {
  const rest = removeStrings(inner);
  if (rest.trim() === "") return true;
  if (/^[\s,()]*$/.test(rest)) return true;
  if (/^[\s,()]*[+-]?\d+(\.\d+)?([eE][+-]?\d+)?[\s,()]*$/.test(rest)) return true;
  if (/^[\s,()]*(True|False|None)([\s,()]+(True|False|None))*[\s,()]*$/.test(rest)) return true;
  return false;
}

function splitTopLevelArgs(s: string): string[] {
  const out: string[] = [];
  let cur = "", q: string | null = null, esc = false;
  for (const ch of s) {
    if (esc) { cur += ch; esc = false; continue; }
    if (q) { cur += ch; if (ch === "\\") esc = true; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ",") { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function literalToText(src: string): string | null {
  const t = src.trim();
  if (!t) return null;
  if (/^[+-]?\d+$/.test(t)) return t.replace(/^\+/, "");
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(t)) return t.replace(/^\+/, "");
  const m = t.match(/^([rb]?)(["'])([\s\S]*)\2$/i);
  if (m) {
    if (/f/i.test(m[1])) return null;
    const body = m[3];
    if (/\\(?!n|t|r|\\|"|'|0|a|b|f|v)/.test(body)) return null;
    return body
      .replace(/\\\\/g, "\u0000")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\u0000/g, "\\");
  }
  if (t === "True" || t === "False" || t === "None") return t;
  return null;
}

function stripComment(line: string): string {
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === "\\") { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === "#") return line.slice(0, i);
  }
  return line;
}

function isLiteralPrintOnly(code: string, expectedOutput: string): boolean {
  const stripped = code
    .replace(/"""[\s\S]*?"""/g, "")
    .replace(/'''[\s\S]*?'''/g, "")
    .split("\n")
    .map((l) => stripComment(l).trim())
    .filter(Boolean);
  if (!stripped.length) return false;
  const rendered: string[] = [];
  for (const line of stripped) {
    const m = line.match(/^print\s*\((.*)\)\s*$/);
    if (!m) return false;
    const inner = m[1].trim();
    if (!inner) { rendered.push(""); continue; }
    if (!isLiteralArgList(inner)) return false;
    const vals: string[] = [];
    for (const p of splitTopLevelArgs(inner)) {
      const v = literalToText(p);
      if (v === null) return false;
      vals.push(v);
    }
    rendered.push(vals.join(" "));
  }
  return normalize(rendered.join("\n")) === normalize(expectedOutput);
}

// ── deepEqual（支持 floatTolerance）────────────────────
function deepEqual(a: unknown, b: unknown, tol = 0): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= (tol || 0);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i], tol));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as object);
    const bk = Object.keys(b as object);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual((a as any)[k], (b as any)[k], tol));
  }
  return a === b;
}

// ── output 模式 ────────────────────────────────────────
function judgeOutput(
  question: Question,
  run: RunResult,
  code: string,
): JudgeOutcome {
  const cfg = question.judge as Extract<JudgeConfig, { type: "output" }>;

  if (!run.ok) {
    return {
      passed: false,
      message: "运行错误",
      detail: run.error ?? run.stderr,
      hint: run.errorType === "SyntaxError" ? "请检查语法是否正确" : undefined,
    };
  }

  const expected = cfg.expectedOutput;
  const actual = run.stdout;
  const opts = cfg.normalize ?? {};
  const normExpected = normalize(expected, opts);
  const normActual = normalize(actual, opts);

  if (normExpected !== normActual) {
    return {
      passed: false,
      message: "输出不匹配",
      detail: `期望输出：\n${expected}\n\n实际输出：\n${actual || "(空)"}`,
    };
  }

  // 防蒙混校验
  if (ENABLE_LITERAL_PRINT_GUARD && !cfg.allowLiteralPrint) {
    if (isLiteralPrintOnly(code, expected)) {
      return {
        passed: false,
        message: "请用完整的代码实现，而不是直接打印结果",
        hint: question.hint ?? "尝试用变量、运算或控制流来计算并输出结果",
      };
    }
  }

  return { passed: true, message: "通过！" };
}

// ── assert 模式 ────────────────────────────────────────
async function judgeAssert(
  question: Question,
  _run: RunResult,
  code: string,
): Promise<JudgeOutcome> {
  const cfg = question.judge as Extract<JudgeConfig, { type: "assert" }>;
  const fullCode = `${code}\n${cfg.testCode}\nprint("__TESTS_PASSED__")`;
  const result = await pyodideClient.run(fullCode, [], 5000);

  if (!result.ok) {
    return {
      passed: false,
      message: "断言失败",
      detail: result.error ?? result.stderr,
    };
  }

  if (result.stdout.includes("__TESTS_PASSED__")) {
    return { passed: true, message: "通过！" };
  }

  return {
    passed: false,
    message: "断言未通过",
    detail: result.stdout || result.stderr || "(无输出)",
  };
}

// ── function 模式 ──────────────────────────────────────
async function judgeFunction(
  question: Question,
  _run: RunResult,
  code: string,
): Promise<JudgeOutcome> {
  const cfg = question.judge as Extract<JudgeConfig, { type: "function" }>;
  const casesJson = JSON.stringify(cfg.cases.map((c) => c.args));
  const scaffold = `${code}
import json
_cases = json.loads(r'''${casesJson}''')
_out = []
for _i, _args in enumerate(_cases):
    try:
        _r = ${cfg.functionName}(*_args)
        _out.append({"i": _i, "ok": True, "value": json.loads(json.dumps(_r, default=str))})
    except Exception as _e:
        _out.append({"i": _i, "ok": False, "error": f"{type(_e).__name__}: {_e}"})
print("__RESULT__" + json.dumps(_out, ensure_ascii=False))
`;

  const result = await pyodideClient.run(scaffold, [], 5000);
  if (!result.ok) {
    return {
      passed: false,
      message: "运行错误",
      detail: result.error ?? result.stderr,
    };
  }

  const marker = "__RESULT__";
  const idx = result.stdout.indexOf(marker);
  if (idx < 0) {
    return { passed: false, message: "未返回测试结果", detail: result.stdout };
  }

  try {
    const out: Array<{ i: number; ok: boolean; value?: unknown; error?: string }> =
      JSON.parse(result.stdout.slice(idx + marker.length));
    const failed: string[] = [];
    out.forEach((r) => {
      const expected = cfg.cases[r.i].expected;
      if (!r.ok || !deepEqual(r.value, expected, cfg.floatTolerance)) {
        failed.push(
          `用例 ${r.i + 1}${cfg.cases[r.i].label ? ` (${cfg.cases[r.i].label})` : ""}: ${r.error ?? `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(r.value)}`}`,
        );
      }
    });

    if (failed.length === 0) return { passed: true, message: "通过！" };
    return { passed: false, message: `${failed.length} 个用例未通过`, detail: failed.join("\n") };
  } catch (e) {
    return { passed: false, message: "结果解析失败", detail: String(e) };
  }
}

// ── 统一入口 ──────────────────────────────────────────
export function judge(
  question: Question,
  run: RunResult,
  code: string,
): JudgeOutcome | Promise<JudgeOutcome> {
  switch (question.judge.type) {
    case "output":
      return judgeOutput(question, run, code);
    case "assert":
      return judgeAssert(question, run, code);
    case "function":
      return judgeFunction(question, run, code);
  }
}
