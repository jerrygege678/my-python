import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../env.js";
import { stmts, type UserRow } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";

export const authRouter = Router();

// ── zod 校验 ──────────────────────────────────────────
const credentialsSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(20, "用户名最多 20 个字符")
    .regex(/^[\w\u4e00-\u9fa5]{3,20}$/, "用户名只能包含字母、数字、下划线、中文"),
  password: z
    .string()
    .min(6, "密码至少 6 位")
    .max(72, "密码最多 72 位")
    .refine((s) => s.trim().length > 0, "密码不能全为空白"),
});

// ── Cookie 下发 ───────────────────────────────────────
function setAuthCookie(res: import("express").Response, userId: number, username: string) {
  const token = jwt.sign({ uid: userId, uname: username }, env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
  res.cookie("pylab_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    secure: env.COOKIE_SECURE,
  });
}

function toUserDTO(row: Pick<UserRow, "id" | "username" | "created_at">) {
  return { id: row.id, username: row.username, createdAt: row.created_at };
}

// ── POST /register ────────────────────────────────────
authRouter.post("/register", async (req, res, next) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.issues[0];
    const isUsername = field.path[0] === "username";
    return next(
      new ApiError(
        isUsername ? "INVALID_USERNAME" : "INVALID_PASSWORD",
        field.message,
        400,
      ),
    );
  }

  const { username, password } = parsed.data;

  // 唯一性检查
  const existing = stmts.findUser.get(username) as UserRow | undefined;
  if (existing) {
    return next(new ApiError("USERNAME_TAKEN", "用户名已存在", 409));
  }

  // bcrypt 哈希 (cost 10)
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  try {
    stmts.insertUser.run(username, passwordHash, createdAt);
  } catch (err: any) {
    // 并发竞态：唯一约束冲突
    if (String(err?.message ?? "").includes("UNIQUE")) {
      return next(new ApiError("USERNAME_TAKEN", "用户名已存在", 409));
    }
    return next(err);
  }

  // 注册即登录：下发 Cookie
  const user = stmts.findUser.get(username) as UserRow;
  setAuthCookie(res, user.id, user.username);
  res.status(201).json({ ok: true, data: { user: toUserDTO(user) } });
});

// ── POST /login ───────────────────────────────────────
authRouter.post("/login", async (req, res, next) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    const field = parsed.error.issues[0];
    const isUsername = field.path[0] === "username";
    return next(
      new ApiError(
        isUsername ? "INVALID_USERNAME" : "INVALID_PASSWORD",
        field.message,
        400,
      ),
    );
  }

  const { username, password } = parsed.data;

  // 查用户；不存在与密码错误统一返回 BAD_CREDENTIALS
  const user = stmts.findUser.get(username) as UserRow | undefined;
  if (!user) {
    return next(new ApiError("BAD_CREDENTIALS", "用户名或密码不正确", 401));
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return next(new ApiError("BAD_CREDENTIALS", "用户名或密码不正确", 401));
  }

  setAuthCookie(res, user.id, user.username);
  res.json({ ok: true, data: { user: toUserDTO(user) } });
});

// ── GET /me ───────────────────────────────────────────
authRouter.get("/me", requireAuth, (req, res, next) => {
  const user = stmts.getUserById.get(req.user!.id) as UserRow | undefined;
  if (!user) {
    return next(new ApiError("UNAUTHORIZED", "用户不存在", 401));
  }
  res.json({ ok: true, data: { user: toUserDTO(user) } });
});

// ── POST /logout ──────────────────────────────────────
authRouter.post("/logout", (_req, res) => {
  res.clearCookie("pylab_token", { path: "/" });
  res.json({ ok: true, data: { message: "已登出" } });
});
