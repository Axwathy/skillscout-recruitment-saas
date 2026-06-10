import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    if (typeof window !== "undefined") {
      try {
        const configuredUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
        const localHostnames = new Set(["localhost", "127.0.0.1"]);

        if (
          localHostnames.has(configuredUrl.hostname) &&
          localHostnames.has(window.location.hostname) &&
          configuredUrl.hostname !== window.location.hostname
        ) {
          configuredUrl.hostname = window.location.hostname;
          return configuredUrl.toString().replace(/\/$/, "");
        }
      } catch {
        return process.env.NEXT_PUBLIC_API_URL;
      }
    }

    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://localhost:8000";
}

const apiBaseUrl = getApiBaseUrl();
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
