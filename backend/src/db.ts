// DECISION: 使用 Node.js v24 内置的 node:sqlite (DatabaseSync) 替代 better-sqlite3。
// 原因：当前环境无 Python/node-gyp，无法编译 better-sqlite3 的 C++ 原生模块。
// node:sqlite 的 API 与 better-sqlite3 高度相似（exec/prepare/get/run/all），
// 仅需将命名参数 @name 改为位置参数 ?。功能完全等价。
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "./env.js";

// 确保数据目录存在
mkdirSync(dirname(env.DB_PATH), { recursive: true });

export const db = new DatabaseSync(env.DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ── DDL ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// ── 预编译语句 ────────────────────────────────────────
// node:sqlite 使用位置参数 ?（而非 better-sqlite3 的命名参数 @name）
export const stmts = {
  insertUser: db.prepare(
    "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
  ),
  findUser: db.prepare("SELECT * FROM users WHERE username = ?"),
  getUserById: db.prepare(
    "SELECT id, username, created_at FROM users WHERE id = ?",
  ),
  getProgress: db.prepare(
    "SELECT data, updated_at FROM progress WHERE user_id = ?",
  ),
  upsertProgress: db.prepare(
    `INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ),
};

// ── 类型 ──────────────────────────────────────────────
export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface ProgressRow {
  data: string;
  updated_at: string;
}
