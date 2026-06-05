import { User } from "@/types/auth";
import { apiFetch } from "./api";

export async function login(credentials: Record<string, string>): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function register(data: Record<string, string>): Promise<User> {
  return apiFetch<User>("/api/v1/auth/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function candidateRegister(data: Record<string, string>): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/api/v1/candidate/auth/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/api/v1/auth/logout/", {
    method: "POST",
  });
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/api/v1/auth/me/", {
    method: "GET",
  });
}

export async function refresh(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/api/v1/auth/refresh/", {
    method: "POST",
  });
}
