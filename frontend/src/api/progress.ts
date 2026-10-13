import { api } from "./client";
import type { ApiResult, ProgressState } from "../types";

interface ProgressResponse {
  progress: ProgressState;
}

interface SaveResponse {
  updatedAt: string;
}

export function fetchProgress(): Promise<ApiResult<ProgressResponse>> {
  return api<ProgressResponse>("/progress", { method: "GET" });
}

export function saveProgress(
  progress: ProgressState
): Promise<ApiResult<SaveResponse>> {
  return api<SaveResponse>("/progress", {
    method: "PUT",
    body: JSON.stringify({ progress }),
  });
}
