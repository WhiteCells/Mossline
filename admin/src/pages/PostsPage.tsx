import { useEffect, useMemo, useState, type Key } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Eye, Plus, Send, Star, Trash2, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { useToast } from "../components/Toast";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useListParams } from "../hooks/useListParams";
import { apiClient } from "../lib/api";
import { formatDate } from "../lib/format";
import { messageFromError, normalizePage } from "../lib/normalize";
import type { Category, EntityId, Post, Tag } from "../types/content";
import { endpoints } from "../types/content";
import { StatusBadge, displayName } from "./common/status";

export function PostsPage() {
  const { query, update } = useListParams({
    sort: "updated_at",
    order: "desc",
  });
  const [search, setSearch] = useState(query.search ?? "");
  const debounced = useDebouncedValue(search);
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  const [topPost, setTopPost] = useState<Post | null>(null);
  const [confirm, setConfirm] = useState<{
    action: "delete" | "publish" | "offline";
    post?: Post;
    batch?: boolean;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useEffect(() => update({ search: debounced }, true), [debounced, update]);
  const list = useQuery({
    queryKey: ["posts", query],
    queryFn: async ({ signal }) =>
      normalizePage<Post>(
        await apiClient.get<unknown>(endpoints.posts, { query, signal }),
        ["items", "posts", "post"],
        { page: query.page, size: query.size },
      ),
    placeholderData: (value) => value,
  });
  const categories = useQuery({
    queryKey: ["categories", "post-filter"],
    queryFn: async ({ signal }) =>
      normalizePage<Category>(
        await apiClient.get<unknown>(endpoints.categories, {
          query: { page: 1, size: 200 },
          signal,
        }),
        ["items", "categories"],
        { page: 1, size: 200 },
      ).items,
  });
  const tags = useQuery({
    queryKey: ["tags", "post-filter"],
    queryFn: async ({ signal }) =>
      normalizePage<Tag>(
        await apiClient.get<unknown>(endpoints.tags, {
          query: { page: 1, size: 500 },
          signal,
        }),
        ["items", "tags"],
        { page: 1, size: 500 },
      ).items,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["posts"] });
  const operation = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      const ids = confirm.batch
        ? ([...selected] as EntityId[])
        : [confirm.post?.id as EntityId];
      if (confirm.action === "delete")
        return confirm.batch
          ? apiClient.delete<unknown, { ids: EntityId[] }>(endpoints.posts, {
              body: { ids },
            })
          : apiClient.delete<unknown>(`${endpoints.posts}/${ids[0]}`);
      return apiClient.patch<unknown, { ids: EntityId[]; status: string }>(
        `${endpoints.posts}/status`,
        { ids, status: confirm.action === "publish" ? "published" : "offline" },
      );
    },
    onSuccess: async () => {
      await refresh();
      toast({ tone: "success", title: "操作成功" });
      setConfirm(null);
      setSelected(new Set());
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "操作失败",
        description: messageFromError(error),
      }),
  });
  const top = useMutation({
    mutationFn: (post: Post) =>
      apiClient.patch<Post, { is_top: boolean }>(
        `${endpoints.posts}/${post.id}`,
        { is_top: !post.is_top },
      ),
    onSuccess: async () => {
      await refresh();
      toast({ tone: "success", title: "置顶状态已更新" });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "操作失败",
        description: messageFromError(error),
      }),
  });

  const columns = useMemo<DataTableColumn<Post>[]>(
    () => [
      {
        key: "title",
        header: "文章",
        sortable: true,
        cell: (post) => (
          <div className="table-primary post-title-cell">
            <div>
              <strong>{post.title}</strong>
              <small>/{post.slug}</small>
            </div>
            {post.is_top && <Star className="top-star" />}
          </div>
        ),
      },
      {
        key: "status",
        header: "状态",
        cell: (post) => <StatusBadge status={post.status} />,
      },
      {
        key: "category",
        header: "分类",
        hideBelow: "tablet",
        cell: (post) => displayName(post.category),
      },
      {
        key: "author",
        header: "作者",
        hideBelow: "desktop",
        cell: (post) => displayName(post.author),
      },
      {
        key: "updated_at",
        header: "更新时间",
        sortable: true,
        hideBelow: "tablet",
        cell: (post) => formatDate(post.updated_at),
      },
      {
        key: "actions",
        header: "操作",
        width: 190,
        align: "right",
        cell: (post) => (
          <div className="table-actions">
            <a
              className="icon-link"
              href={`/articles?q=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noreferrer"
              title="查看"
            >
              <Eye />
            </a>
            <Button
              size="icon"
              variant="ghost"
              title={post.is_top ? "取消置顶" : "置顶"}
              onClick={() => setTopPost(post)}
            >
              <Star />
            </Button>
            <Link
              className="icon-link"
              to={`/posts/${post.id}/edit`}
              title="编辑"
            >
              <Edit3 />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="danger-action"
              title="删除"
              onClick={() => setConfirm({ action: "delete", post })}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeader
        title="文章管理"
        description="创建、筛选和维护文章发布状态。"
        actions={
          <Link className="ui-link-button" to="/posts/new">
            <Plus />
            新建文章
          </Link>
        }
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索标题、Slug、摘要…"
        actions={
          selected.size ? (
            <div className="batch-actions">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Send />}
                onClick={() => setConfirm({ action: "publish", batch: true })}
              >
                发布
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Undo2 />}
                onClick={() => setConfirm({ action: "offline", batch: true })}
              >
                下架
              </Button>
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 />}
                onClick={() => setConfirm({ action: "delete", batch: true })}
              >
                删除 ({selected.size})
              </Button>
            </div>
          ) : undefined
        }
      >
        <select
          value={query.status ?? ""}
          onChange={(event) => update({ status: event.target.value }, true)}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="scheduled">定时发布</option>
          <option value="offline">已下架</option>
        </select>
        <select
          value={String(query.category ?? "")}
          onChange={(event) => update({ category: event.target.value }, true)}
        >
          <option value="">全部分类</option>
          {categories.data?.map((item) => (
            <option value={item.id} key={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          value={String(query.tag ?? "")}
          onChange={(event) => update({ tag: event.target.value }, true)}
        >
          <option value="">全部标签</option>
          {tags.data?.map((item) => (
            <option value={item.id} key={item.id}>{item.name}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="开始发布时间"
          value={String(query.date_from ?? "")}
          onChange={(event) => update({ date_from: event.target.value }, true)}
        />
        <input
          type="date"
          aria-label="结束发布时间"
          value={String(query.date_to ?? "")}
          onChange={(event) => update({ date_to: event.target.value }, true)}
        />
      </FilterBar>
      <DataTable
        columns={columns}
        data={list.data?.items ?? []}
        rowKey={(post) => post.id}
        loading={list.isLoading}
        error={list.isError ? messageFromError(list.error) : null}
        onRetry={() => void list.refetch()}
        selectedKeys={selected}
        onSelectionChange={setSelected}
        sort={
          query.sort
            ? { key: query.sort, direction: query.order ?? "desc" }
            : undefined
        }
        onSortChange={(sort) =>
          update({ sort: sort.key, order: sort.direction }, true)
        }
        emptyTitle="还没有文章"
        emptyDescription="创建第一篇文章，开始记录时间的痕迹。"
        emptyAction={
          <Link className="ui-link-button" to="/posts/new">
            <Plus />
            新建文章
          </Link>
        }
      />
      {list.data && (
        <Pagination
          page={list.data.pagination.page}
          pageSize={list.data.pagination.size}
          total={list.data.pagination.total}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(size) => update({ page: 1, size })}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !operation.isPending && setConfirm(null)}
        onConfirm={() => operation.mutateAsync()}
        loading={operation.isPending}
        danger={confirm?.action === "delete"}
        title={
          confirm?.action === "delete"
            ? `删除${confirm.batch ? `所选 ${selected.size} 篇文章` : "文章"}？`
            : `${confirm?.action === "publish" ? "发布" : "下架"}所选文章？`
        }
        description={
          confirm?.action === "delete"
            ? "删除会影响文章内容及附件关联，操作完成后可能无法恢复。"
            : "状态变更会立即影响前台内容可见性。"
        }
        confirmLabel="确认操作"
      />
      <ConfirmDialog
        open={topPost !== null}
        onClose={() => !top.isPending && setTopPost(null)}
        onConfirm={async () => {
          if (topPost) await top.mutateAsync(topPost);
          setTopPost(null);
        }}
        loading={top.isPending}
        danger={false}
        title={topPost?.is_top ? "取消置顶这篇文章？" : "置顶这篇文章？"}
        description="置顶状态会立即改变前台文章的展示顺序。"
        confirmLabel="确认变更"
      />
    </>
  );
}
