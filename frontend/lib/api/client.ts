import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

function getApiBaseUrl() {
  // In the browser, use a relative (same-origin) base URL so every API call
  // is made to the frontend's own domain and then proxied to the backend via
  // the rewrite in next.config.mjs. This keeps the auth cookies first-party to
  // the frontend domain, which is required when the backend runs on a
  // different host (e.g. frontend on Vercel, backend on Railway) — otherwise
  // the cookies are third-party and the browser/middleware never see them.
  if (typeof window !== "undefined") {
    return "";
  }

  // Server-side (SSR / build): talk to the backend origin directly.
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

const apiBaseUrl = getApiBaseUrl();
const csrfEndpoint = "/api/v1/auth/csrf/";
const refreshEndpoint = "/api/v1/auth/refresh/";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function flushRefreshQueue(error?: unknown) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  refreshQueue = [];
}

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:session-expired"));
  }
}

function shouldBypassRefresh(url: string | undefined) {
  if (!url) return false;
  return (
    url === refreshEndpoint ||
    url === "/api/v1/auth/login/" ||
    url === "/api/v1/auth/register/" ||
    url === "/api/v1/candidate/auth/register/"
  );
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isUnsafeMethod(method: string | undefined) {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes((method ?? "GET").toUpperCase());
}

apiClient.interceptors.request.use(async (config) => {
  if (!isUnsafeMethod(config.method) || config.url === csrfEndpoint) {
    return config;
  }

  let csrfToken = getCookie("csrftoken");
  if (!csrfToken && typeof window !== "undefined") {
    const response = await axios.get<{ csrfToken: string }>(`${apiBaseUrl}${csrfEndpoint}`, {
      withCredentials: true,
    });
    csrfToken = response.data.csrfToken || getCookie("csrftoken");
  }

  if (csrfToken) {
    config.headers.set("X-CSRFToken", csrfToken);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      shouldBypassRefresh(originalRequest.url)
    ) {
      if (status === 401 && originalRequest?.url === refreshEndpoint) {
        notifySessionExpired();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    isRefreshing = true;

    try {
      await apiClient.post(refreshEndpoint);
      flushRefreshQueue();
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushRefreshQueue(refreshError);
      notifySessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export type ApiRequestConfig = AxiosRequestConfig;
