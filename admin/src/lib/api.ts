import type {
  ApiCode,
  ApiEnvelope,
  BodyRequestOptions,
  DeleteRequestOptions,
  FieldErrors,
  QueryParams,
  RequestOptions,
  UploadOptions,
} from "../types/api";

export const AUTH_TOKEN_STORAGE_KEY = "mossline.admin.auth-token";
export const API_UNAUTHORIZED_EVENT = "mossline:auth:unauthorized";

let volatileToken: string | null = null;

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  try {
    return getSessionStorage()?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function persistToken(token: string): void {
  try {
    getSessionStorage()?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // The in-memory value keeps auth usable when storage is blocked.
  }
}

function removeStoredToken(): void {
  try {
    getSessionStorage()?.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Clearing the in-memory value is sufficient for this page lifecycle.
  }
}

export const authTokenStorage = {
  get(): string | null {
    const token = readStoredToken() ?? volatileToken;
    return token && token.trim() ? token : null;
  },
  set(token: string): void {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error("Authentication token cannot be empty");
    }

    volatileToken = normalizedToken;
    persistToken(normalizedToken);
  },
  clear(): void {
    volatileToken = null;
    removeStoredToken();
  },
};

export interface ApiErrorOptions {
  status: number;
  code?: ApiCode;
  fieldErrors?: FieldErrors;
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiCode;
  readonly fieldErrors: FieldErrors;
  readonly details?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.details = options.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === 401 || this.code === "401";
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

function emitUnauthorized(): void {
  authTokenStorage.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
  }
}

export function onUnauthorized(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(API_UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(API_UNAUTHORIZED_EVENT, listener);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    isRecord(value) &&
    (typeof value.code === "number" || typeof value.code === "string") &&
    "data" in value &&
    typeof value.msg === "string"
  );
}

function isSuccessCode(code: ApiCode): boolean {
  if (code === 0 || code === "0") return true;
  const numericCode = typeof code === "number" ? code : Number(code);
  return (
    Number.isFinite(numericCode) && numericCode >= 200 && numericCode < 300
  );
}

function toErrorList(value: unknown): string[] | null {
  if (typeof value === "string" && value.trim()) return [value];
  if (!Array.isArray(value)) return null;

  const messages = value.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
  return messages.length ? messages : null;
}

function extractFieldErrors(payload: unknown): FieldErrors {
  if (!isRecord(payload)) return {};

  const candidates = [
    payload.fieldErrors,
    payload.field_errors,
    payload.errors,
  ];
  if (isRecord(payload.data)) {
    candidates.push(
      payload.data.fieldErrors,
      payload.data.field_errors,
      payload.data.errors,
    );
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const result: FieldErrors = {};
      for (const item of candidate) {
        if (!isRecord(item)) continue;
        const field = typeof item.field === "string" ? item.field : item.path;
        const message =
          typeof item.message === "string" ? item.message : item.msg;
        if (
          typeof field !== "string" ||
          typeof message !== "string" ||
          !message.trim()
        )
          continue;
        result[field] = [...(result[field] ?? []), message];
      }
      if (Object.keys(result).length) return result;
    }
    if (!isRecord(candidate)) continue;

    const result: FieldErrors = {};
    for (const [field, value] of Object.entries(candidate)) {
      const messages = toErrorList(value);
      if (messages) result[field] = messages;
    }
    if (Object.keys(result).length) return result;
  }

  return {};
}

function errorMessage(payload: unknown, fallback: string): string {
  if (isEnvelope(payload) && payload.msg.trim()) return payload.msg;
  if (isRecord(payload)) {
    for (const key of ["message", "msg", "error"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}

function errorCode(payload: unknown): ApiCode | undefined {
  if (isEnvelope(payload)) return payload.code;
  if (!isRecord(payload)) return undefined;
  return typeof payload.code === "number" || typeof payload.code === "string"
    ? payload.code
    : undefined;
}

function normalizeError(
  status: number,
  payload: unknown,
  fallback: string,
): ApiError {
  const code = errorCode(payload);
  const numericCode = typeof code === "number" ? code : Number(code);
  const effectiveStatus =
    status >= 200 &&
    status < 300 &&
    Number.isInteger(numericCode) &&
    numericCode >= 400 &&
    numericCode <= 599
      ? numericCode
      : status;
  const error = new ApiError(errorMessage(payload, fallback), {
    status: effectiveStatus,
    code,
    fieldErrors: extractFieldErrors(payload),
    details: payload,
  });
  if (error.isUnauthorized) emitUnauthorized();
  return error;
}

function unwrap<T>(payload: unknown, status: number): T {
  if (!isEnvelope(payload)) return payload as T;
  if (!isSuccessCode(payload.code)) {
    throw normalizeError(status, payload, "请求失败");
  }
  return payload.data as T;
}

function appendQuery(path: string, query?: QueryParams): string {
  if (!query) return path;

  const [pathAndQuery = "", hash = ""] = path.split("#", 2);
  const [pathname = "", existingQuery = ""] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(existingQuery);

  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
  }

  const serialized = params.toString();
  return `${pathname}${serialized ? `?${serialized}` : ""}${hash ? `#${hash}` : ""}`;
}

function parseResponseBody(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function createHeaders(
  headers: HeadersInit | undefined,
  hasJsonBody: boolean,
): Headers {
  const result = new Headers(headers);
  result.set("Accept", "application/json");
  if (hasJsonBody && !result.has("Content-Type")) {
    result.set("Content-Type", "application/json");
  }

  const token = authTokenStorage.get();
  if (token && !result.has("Authorization")) {
    result.set("Authorization", `Bearer ${token}`);
  }
  return result;
}

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T, B = unknown>(
    path: string,
    body: B,
    options?: BodyRequestOptions,
  ): Promise<T>;
  put<T, B = unknown>(
    path: string,
    body: B,
    options?: BodyRequestOptions,
  ): Promise<T>;
  patch<T, B = unknown>(
    path: string,
    body: B,
    options?: BodyRequestOptions,
  ): Promise<T>;
  delete<T, B = unknown>(
    path: string,
    options?: DeleteRequestOptions<B>,
  ): Promise<T>;
  upload<T>(path: string, file: File, options?: UploadOptions): Promise<T>;
}

export function createApiClient(baseUrl = ""): ApiClient {
  async function request<T, B = unknown>(
    method: string,
    path: string,
    body: B | undefined,
    options: RequestOptions = {},
  ): Promise<T> {
    const hasBody = body !== undefined;
    let response: Response;

    try {
      response = await fetch(
        joinUrl(baseUrl, appendQuery(path, options.query)),
        {
          method,
          headers: createHeaders(options.headers, hasBody),
          body: hasBody ? JSON.stringify(body) : undefined,
          signal: options.signal,
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      throw new ApiError("无法连接到服务器，请检查网络后重试", {
        status: 0,
        code: "NETWORK_ERROR",
        cause: error,
      });
    }

    const payload = parseResponseBody(await response.text());
    if (!response.ok) {
      throw normalizeError(
        response.status,
        payload,
        `请求失败 (${response.status})`,
      );
    }
    return unwrap<T>(payload, response.status);
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>("GET", path, undefined, options),
    post: <T, B = unknown>(
      path: string,
      body: B,
      options?: BodyRequestOptions,
    ) => request<T, B>("POST", path, body, options),
    put: <T, B = unknown>(
      path: string,
      body: B,
      options?: BodyRequestOptions,
    ) => request<T, B>("PUT", path, body, options),
    patch: <T, B = unknown>(
      path: string,
      body: B,
      options?: BodyRequestOptions,
    ) => request<T, B>("PATCH", path, body, options),
    delete: <T, B = unknown>(
      path: string,
      options: DeleteRequestOptions<B> = {},
    ) => request<T, B>("DELETE", path, options.body, options),
    upload: <T>(path: string, file: File, options: UploadOptions = {}) =>
      new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        const abort = () => xhr.abort();
        let settled = false;

        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          options.signal?.removeEventListener("abort", abort);
          callback();
        };

        if (options.signal?.aborted) {
          reject(new DOMException("The operation was aborted", "AbortError"));
          return;
        }

        formData.append(
          options.fieldName ?? "file",
          file,
          options.fileName ?? file.name,
        );
        for (const [key, value] of Object.entries(options.metadata ?? {})) {
          formData.append(key, value instanceof Blob ? value : String(value));
        }

        xhr.open("POST", joinUrl(baseUrl, path));
        const headers = createHeaders(options.headers, false);
        headers.forEach((value, key) => xhr.setRequestHeader(key, value));

        xhr.upload.onprogress = (event) => {
          const total = event.lengthComputable ? event.total : null;
          options.onProgress?.({
            loaded: event.loaded,
            total,
            percent:
              total && total > 0
                ? Math.round((event.loaded / total) * 100)
                : null,
          });
        };
        xhr.onerror = () =>
          finish(() =>
            reject(
              new ApiError("上传失败，请检查网络后重试", {
                status: 0,
                code: "NETWORK_ERROR",
              }),
            ),
          );
        xhr.onabort = () =>
          finish(() =>
            reject(new DOMException("The operation was aborted", "AbortError")),
          );
        xhr.onload = () => {
          const payload = parseResponseBody(xhr.responseText);
          if (xhr.status < 200 || xhr.status >= 300) {
            finish(() =>
              reject(
                normalizeError(xhr.status, payload, `上传失败 (${xhr.status})`),
              ),
            );
            return;
          }
          try {
            const data = unwrap<T>(payload, xhr.status);
            finish(() => resolve(data));
          } catch (error) {
            finish(() => reject(error));
          }
        };

        options.signal?.addEventListener("abort", abort, { once: true });
        xhr.send(formData);
      }),
  };
}

export const apiClient = createApiClient();

export const apiPaths = {
  login: "/api/login",
  logout: "/api/logout",
  currentUser: "/api/me",
  dashboard: "/api/admin/dashboard",
  users: "/api/admin/users",
  posts: "/api/post",
  categories: "/api/category",
  tags: "/api/tag",
  moments: "/api/moment",
  links: "/api/friend",
  attachments: "/api/attachment",
  about: "/api/about",
  logs: "/api/log",
} as const;
