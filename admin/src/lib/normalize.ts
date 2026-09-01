import type { Paginated, PaginationMeta } from "../types/content";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizePage<T>(
  input: unknown,
  keys: readonly string[],
  fallback: { page: number; size: number },
): Paginated<T> {
  if (Array.isArray(input)) {
    return {
      items: input as T[],
      pagination: {
        page: fallback.page,
        size: fallback.size,
        total: input.length,
        total_pages: Math.max(1, Math.ceil(input.length / fallback.size)),
      },
    };
  }

  if (!isRecord(input)) return emptyPage(fallback);
  const list = keys.map((key) => input[key]).find(Array.isArray);
  const paginationSource = isRecord(input.pagination)
    ? input.pagination
    : input;
  const items = (list ?? []) as T[];
  const pagination: PaginationMeta = {
    page: numberValue(paginationSource.page, fallback.page),
    size: numberValue(paginationSource.size, fallback.size),
    total: numberValue(paginationSource.total, items.length),
    total_pages: numberValue(
      paginationSource.total_pages,
      Math.max(
        1,
        Math.ceil(
          numberValue(paginationSource.total, items.length) / fallback.size,
        ),
      ),
    ),
    has_more:
      typeof paginationSource.has_more === "boolean"
        ? paginationSource.has_more
        : undefined,
  };
  return { items, pagination };
}

export function emptyPage<T>(fallback: {
  page: number;
  size: number;
}): Paginated<T> {
  return {
    items: [],
    pagination: {
      page: fallback.page,
      size: fallback.size,
      total: 0,
      total_pages: 1,
    },
  };
}

export function messageFromError(
  error: unknown,
  fallback = "请求失败，请稍后重试。",
): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isRecord(error) || !isRecord(error.fieldErrors)) return {};
  return Object.fromEntries(
    Object.entries(error.fieldErrors).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[key, value]]
        : Array.isArray(value) && typeof value[0] === "string"
          ? [[key, value[0]]]
          : [],
    ),
  );
}
