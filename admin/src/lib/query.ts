import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof DOMException && error.name === "AbortError")
    return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500)
    return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});

const listKey = <T extends string, P>(resource: T, params?: P) =>
  params === undefined
    ? ([resource, "list"] as const)
    : ([resource, "list", params] as const);

const detailKey = <T extends string>(resource: T, id: string | number) =>
  [resource, "detail", id] as const;

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  currentUser: ["auth", "current-user"] as const,
  users: {
    all: ["users"] as const,
    list: <P>(params?: P) => listKey("users", params),
    detail: (id: string | number) => detailKey("users", id),
  },
  posts: {
    all: ["posts"] as const,
    list: <P>(params?: P) => listKey("posts", params),
    detail: (id: string | number) => detailKey("posts", id),
  },
  categories: {
    all: ["categories"] as const,
    list: <P>(params?: P) => listKey("categories", params),
    detail: (id: string | number) => detailKey("categories", id),
  },
  tags: {
    all: ["tags"] as const,
    list: <P>(params?: P) => listKey("tags", params),
    detail: (id: string | number) => detailKey("tags", id),
  },
  moments: {
    all: ["moments"] as const,
    list: <P>(params?: P) => listKey("moments", params),
    detail: (id: string | number) => detailKey("moments", id),
  },
  links: {
    all: ["links"] as const,
    list: <P>(params?: P) => listKey("links", params),
    detail: (id: string | number) => detailKey("links", id),
  },
  attachments: {
    all: ["attachments"] as const,
    list: <P>(params?: P) => listKey("attachments", params),
    detail: (id: string | number) => detailKey("attachments", id),
    relations: (id: string | number) =>
      ["attachments", "detail", id, "relations"] as const,
  },
  about: ["about"] as const,
  logs: {
    all: ["logs"] as const,
    list: <P>(params?: P) => listKey("logs", params),
  },
} as const;
