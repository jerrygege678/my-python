import type { ErrorRequestHandler, RequestHandler } from "express";

/** 自定义 API 错误：携带 code + httpStatus */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 400,
  ) {
    super(message);
  }
}

/** 统一错误响应：{ ok:false, error:{ code, message } } */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.httpStatus).json({
      ok: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // 未知错误 → 500，不泄露堆栈
  console.error("[unhandled]", err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "服务器出了点问题，请稍后重试" },
  });
};

/** 404 兜底（放在路由之后、errorHandler 之前） */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "接口不存在" },
  });
};
