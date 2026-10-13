import dotenv from "dotenv";
import { resolve } from "node:path";

// DECISION: 用 dotenv-cli 加载 .env；tsx watch 模式下手动调用确保生效
dotenv.config({ path: resolve(process.cwd(), ".env") });

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`[env] 缺少必需环境变量 ${key}，请复制 .env.example 为 .env 并填写`);
    process.exit(1);
  }
  return v;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) {
  console.error("[env] JWT_SECRET 长度不足 32 字符，请用 `openssl rand -base64 48` 生成");
  process.exit(1);
}

export const env = {
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  JWT_SECRET: jwtSecret,
  DB_PATH: process.env.DB_PATH ?? "./data/pylab.db",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
} as const;

export type Env = typeof env;
