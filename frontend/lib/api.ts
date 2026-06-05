import { AxiosError, type AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api/client";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    super(data?.detail || "An error occurred with the API request.");
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  return extractErrorMessage(error.data) || error.message || fallback;
}

function extractErrorMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => extractErrorMessage(item))
      .filter((message): message is string => Boolean(message));
    return messages.join(" ") || null;
  }

  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    if (typeof data.detail === "string") {
      return data.detail;
    }

    const messages = Object.entries(data)
      .map(([field, message]) => {
        const extracted = extractErrorMessage(message);
        return extracted ? `${field}: ${extracted}` : null;
      })
      .filter((message): message is string => Boolean(message));
    return messages.join(" ") || null;
  }

  return null;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const config: AxiosRequestConfig = {
    url: endpoint,
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string> | undefined),
    },
    data: options.body,
  };

  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.status ?? 0,
        error.response?.data ?? { detail: error.message },
      );
    }
    throw error;
  }
}
