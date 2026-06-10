import { API_URL } from "@/constants/env";

type RequestOptions = RequestInit & {
  params?: Record<string, string>;
};

function buildUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path.startsWith("/") ? path.slice(1) : path, API_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers, ...init } = options;

  const finalHeaders: Record<string, string> = {};

  if (init.body && !(init.body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  } else if (!init.body) {
    // Default Content-Type for JSON-based GET/POST requests without body
    finalHeaders["Content-Type"] = "application/json";
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path, params), {
    ...init,
    headers: {
      ...finalHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !path.endsWith("/login") && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      window.location.href = "/";
    }

    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (_) {
      // Fallback if response is not JSON
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
