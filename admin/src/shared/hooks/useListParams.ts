import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ListQuery } from "../types/content";

const DEFAULT_PAGE_SIZE = 10;

/** 将列表筛选和分页同步到 URL，更新筛选时可重置页码，并替换当前历史记录 */
export function useListParams(defaults: Partial<ListQuery> = {}) {
  const [params, setParams] = useSearchParams();
  const query = useMemo<ListQuery>(
    () => ({
      page: Math.max(
        1,
        Number(params.get("page")) || Number(defaults.page) || 1,
      ),
      size: Math.max(
        1,
        Number(params.get("size")) ||
          Number(defaults.size) ||
          DEFAULT_PAGE_SIZE,
      ),
      search: params.get("search") || defaults.search || undefined,
      status: params.get("status") || defaults.status || undefined,
      category: params.get("category") || defaults.category || undefined,
      tag: params.get("tag") || defaults.tag || undefined,
      date_from: params.get("date_from") || defaults.date_from || undefined,
      date_to: params.get("date_to") || defaults.date_to || undefined,
      role: params.get("role") || defaults.role || undefined,
      type: params.get("type") || defaults.type || undefined,
      referenced: params.get("referenced") || defaults.referenced || undefined,
      sort: params.get("sort") || defaults.sort || undefined,
      order:
        (params.get("order") as "asc" | "desc" | null) ||
        defaults.order ||
        undefined,
    }),
    [
      defaults.order,
      defaults.page,
      defaults.search,
      defaults.size,
      defaults.sort,
      defaults.status,
      defaults.category,
      defaults.tag,
      defaults.date_from,
      defaults.date_to,
      defaults.role,
      defaults.type,
      defaults.referenced,
      params,
    ],
  );

  const update = useCallback(
    (next: Partial<ListQuery>, resetPage = false) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          Object.entries(next).forEach(([key, value]) => {
            if (value === "" || value === undefined || value === null)
              updated.delete(key);
            else updated.set(key, String(value));
          });
          if (resetPage) updated.set("page", "1");
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { query, update };
}
