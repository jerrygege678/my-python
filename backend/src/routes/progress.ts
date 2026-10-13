import { Router } from "express";
import { z } from "zod";
import { stmts, type ProgressRow } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";

export const progressRouter = Router();

// ── zod 校验：ProgressState（不含 userId） ────────────
const questionProgressSchema = z.object({
  status: z.enum(["todo", "passed"]),
  attempts: z.number().int().min(0),
  passedAt: z.string().optional(),
  lastCode: z.string().optional(),
  usedAnswer: z.boolean().optional(),
});

const progressSchema = z.object({
  version: z.literal(2),
  questions: z.record(z.string(), questionProgressSchema),
  offline: z.record(
    z.string(),
    z.object({
      done: z.boolean(),
      doneAt: z.string().optional(),
    }),
  ),
  offlineChecks: z.record(z.string(), z.boolean()),
  updatedAt: z.string(),
});

const putBodySchema = z.object({
  progress: progressSchema,
});

// 空进度骨架
function emptyProgress() {
  return {
    version: 2 as const,
    questions: {},
    offline: {},
    offlineChecks: {},
    updatedAt: new Date().toISOString(),
  };
}

// ── GET / ─────────────────────────────────────────────
progressRouter.get("/", requireAuth, (req, res) => {
  const row = stmts.getProgress.get(req.user!.id) as
    | ProgressRow
    | undefined;

  if (!row) {
    res.json({ ok: true, data: { progress: emptyProgress() } });
    return;
  }

  try {
    const data = JSON.parse(row.data);
    res.json({ ok: true, data: { progress: data } });
  } catch {
    // 数据库里的 JSON 损坏 → 返回空骨架
    res.json({ ok: true, data: { progress: emptyProgress() } });
  }
});

// ── PUT / ─────────────────────────────────────────────
progressRouter.put("/", requireAuth, (req, res, next) => {
  const parsed = putBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      new ApiError("INVALID_PROGRESS", "进度数据结构不合法", 400),
    );
  }

  const { progress } = parsed.data;
  const data = JSON.stringify(progress);
  const updatedAt = new Date().toISOString();

  stmts.upsertProgress.run(req.user!.id, data, updatedAt);

  res.json({ ok: true, data: { updatedAt } });
});
