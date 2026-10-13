import { api } from "./client";
import type { ApiResult, User, Credentials } from "../types";

interface AuthResponse {
  user: User;
}

export function register(c: Credentials): Promise<ApiResult<AuthResponse>> {
  return api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(c),
  });
}

export function login(c: Credentials): Promise<ApiResult<AuthResponse>> {
  return api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(c),
  });
}

export function logout(): Promise<ApiResult<null>> {
  return api<null>("/auth/logout", { method: "POST" });
}

export function me(): Promise<ApiResult<AuthResponse>> {
  return api<AuthResponse>("/auth/me", { method: "GET" });
}
