import { useEffect, useState, type Key } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Power, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../ui/DataTable";
import { FilterBar } from "../ui/FilterBar";
import { PageHeader } from "../ui/PageHeader";
import { Pagination } from "../ui/Pagination";
import { useToast } from "../ui/Toast";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useListParams } from "../hooks/useListParams";
import { apiClient } from "../api/api";
import { messageFromError, normalizePage } from "../utils/normalize";
import type { EntityId } from "../types/content";

interface Identified {
  id: EntityId;
  status?: string;
}
export interface ContentListPageProps<T extends Identified> {
  title: string;
  description: string;
  singular: string;
  endpoint: string;
  queryKey: string;
  listKeys: readonly string[];
  columns: DataTableColumn<T>[];
  newPath: string;
  editPath: (item: T) => string;
}

/** 共用文章和动态的分页、筛选与批量操作流程，具体列和请求由页面配置 */
export function ContentListPage<T extends Identified>({
  title,
  description,
  singular,
  endpoint,
  queryKey,
  listKeys,
  columns,
  newPath,
  editPath,
}: ContentListPageProps<T>) {
  const { query, update } = useListParams({
    sort: "updated_at",
    order: "desc",
  });
  const [search, setSearch] = useState(query.search ?? "");
  const debounced = useDebouncedValue(search);
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  const [confirm, setConfirm] = useState<T | "batch" | null>(null);
  const [statusItem, setStatusItem] = useState<T | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useEffect(() => update({ search: debounced }, true), [debounced, update]);
  const list = useQuery({
    queryKey: [queryKey, query],
    queryFn: async ({ signal }) =>
      normalizePage<T>(
        await apiClient.get<unknown>(endpoint, { query, signal }),
        listKeys,
        { page: query.page, size: query.size },
      ),
    placeholderData: (value) => value,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [queryKey] });
  const remove = useMutation({
    mutationFn: () =>
      confirm === "batch"
        ? apiClient.delete<unknown, { ids: EntityId[] }>(endpoint, {
            body: { ids: [...selected] as EntityId[] },
          })
        : apiClient.delete<unknown>(`${endpoint}/${confirm && confirm.id}`),
    onSuccess: async () => {
      await refresh();
      toast({ tone: "success", title: `${singular}已删除` });
      setConfirm(null);
      setSelected(new Set());
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "删除失败",
        description: messageFromError(error),
      }),
  });
  const toggle = useMutation({
    mutationFn: (item: T) =>
      apiClient.patch<T, { status: string }>(`${endpoint}/${item.id}/status`, {
        status: item.status === "published" ? "offline" : "published",
      }),
    onSuccess: async () => {
      await refresh();
      toast({ tone: "success", title: "发布状态已更新" });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "操作失败",
        description: messageFromError(error),
      }),
  });
  const actionColumn: DataTableColumn<T> = {
    key: "actions",
    header: "操作",
    width: 145,
    align: "right",
    cell: (item) => (
      <div className="table-actions">
        <Button
          variant="ghost"
          size="icon"
          title={item.status === "published" ? "下架" : "发布"}
          onClick={() => setStatusItem(item)}
        >
          <Power />
        </Button>
        <Link className="icon-link" to={editPath(item)} title="编辑">
          <Edit3 />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          title="删除"
          className="danger-action"
          onClick={() => setConfirm(item)}
        >
          <Trash2 />
        </Button>
      </div>
    ),
  };
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link className="ui-link-button" to={newPath}>
            <Plus />
            新增{singular}
          </Link>
        }
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`搜索${singular}…`}
        actions={
          selected.size ? (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 />}
              onClick={() => setConfirm("batch")}
            >
              删除所选 ({selected.size})
            </Button>
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
          <option value="offline">已下架</option>
        </select>
      </FilterBar>
      <DataTable
        columns={[...columns, actionColumn]}
        data={list.data?.items ?? []}
        rowKey={(item) => item.id}
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
        emptyTitle={`暂无${singular}`}
        emptyDescription={`创建第一条${singular}后会显示在这里。`}
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
        onClose={() => !remove.isPending && setConfirm(null)}
        onConfirm={() => remove.mutateAsync()}
        loading={remove.isPending}
        title={`删除${confirm === "batch" ? `所选 ${selected.size} 条${singular}` : `这条${singular}`}？`}
        description="删除后可能无法恢复，且会解除相关附件关联。"
        confirmLabel="确认删除"
      />
      <ConfirmDialog
        open={statusItem !== null}
        onClose={() => !toggle.isPending && setStatusItem(null)}
        onConfirm={async () => {
          if (statusItem) await toggle.mutateAsync(statusItem);
          setStatusItem(null);
        }}
        loading={toggle.isPending}
        danger={statusItem?.status === "published"}
        title={
          statusItem?.status === "published"
            ? `下架这条${singular}？`
            : `发布这条${singular}？`
        }
        description="状态变更会立即影响前台内容可见性。"
        confirmLabel="确认变更"
      />
    </>
  );
}
