import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { ApiError } from "./error.js";

// 扩展 Express Request，挂载 req.user
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: number; username: string };
  }
}

/** 解析 Cookie → 校验 JWT → 挂 req.user；失败 401 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.pylab_token;
  if (!token) return next(new ApiError("UNAUTHORIZED", "未登录", 401));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as { uid: number; uname: string };
    req.user = { id: payload.uid, username: payload.uname };
    next();
  } catch {
    return next(new ApiError("UNAUTHORIZED", "会话已失效，请重新登录", 401));
  }
};
