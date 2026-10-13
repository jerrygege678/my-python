import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { progressRouter } from "./routes/progress.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

// trust proxy（限流需取真实 IP）
app.set("trust proxy", 1);

// 安全头
app.use(helmet());

// CORS（必须 credentials:true，否则 Cookie 不生效）
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Cookie 解析
app.use(cookieParser());

// JSON body（限制 256kb，防止进度体过大）
app.use(express.json({ limit: "256kb" }));

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, data: { status: "ok" } });
});

// 登录/注册限流：每分钟 10 次
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "TOO_MANY_REQUESTS", message: "尝试过于频繁，请 1 分钟后再试" },
  },
});

// ── 路由挂载 ──────────────────────────────────────────
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/progress", progressRouter);

// 404 + 错误兜底
app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[server] Python Lab backend running on http://localhost:${env.PORT}`);
});
