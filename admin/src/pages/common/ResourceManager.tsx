import { useEffect, useState, type Key, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { FilterBar } from "../../components/FilterBar";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { useToast } from "../../components/Toast";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useListParams } from "../../hooks/useListParams";
import { apiClient } from "../../lib/api";
import { formatDate } from "../../lib/format";
import {
  getFieldErrors,
  messageFromError,
  normalizePage,
} from "../../lib/normalize";
import type { EntityId } from "../../types/content";
import { StatusBadge } from "./status";

type FormValue = string | number | boolean;
type FormRecord = Record<string, FormValue>;

export interface ManagedResource {
  id: EntityId;
  name: string;
  activate?: boolean;
  sort?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ResourceField {
  name: string;
  label: string;
  type?:
    "text" | "url" | "email" | "number" | "textarea" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  full?: boolean;
  options?: Array<{ value: string; label: string }>;
  validate?: (value: FormValue, values: FormRecord) => string | undefined;
}

export interface ResourceManagerProps<T extends ManagedResource> {
  title: string;
  description: string;
  endpoint: string;
  queryKey: string;
  singular: string;
  fields: ResourceField[];
  listKeys: readonly string[];
  createInitial: FormRecord;
  toForm: (item: T) => FormRecord;
  extraColumns?: DataTableColumn<T>[];
  impact?: (item: T) => ReactNode;
  apiNote?: ReactNode;
}

export function ResourceManager<T extends ManagedResource>({
  title,
  description,
  endpoint,
  queryKey,
  singular,
  fields,
  listKeys,
  createInitial,
  toForm,
  extraColumns = [],
  impact,
  apiNote,
}: ResourceManagerProps<T>) {
  const { query, update } = useListParams({ sort: "sort", order: "asc" });
  const [search, setSearch] = useState(query.search ?? "");
  const debouncedSearch = useDebouncedValue(search);
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  const [editing, setEditing] = useState<T | null | "new">(null);
  const [deleting, setDeleting] = useState<T | "batch" | null>(null);
  const [statusItem, setStatusItem] = useState<T | null>(null);
  const [values, setValues] = useState<FormRecord>(createInitial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(
    () => update({ search: debouncedSearch }, true),
    [debouncedSearch, update],
  );

  const list = useQuery({
    queryKey: [queryKey, query],
    queryFn: async ({ signal }) =>
      normalizePage<T>(
        await apiClient.get<unknown>(endpoint, { query, signal }),
        listKeys,
        { page: query.page, size: query.size },
      ),
    placeholderData: (previous) => previous,
  });

  const save = useMutation({
    mutationFn: () =>
      editing === "new"
        ? apiClient.post<T, FormRecord>(endpoint, values)
        : apiClient.put<T, FormRecord>(`${endpoint}/${editing?.id}`, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({
        tone: "success",
        title: `${singular}${editing === "new" ? "已创建" : "已更新"}`,
      });
      setEditing(null);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      toast({
        tone: "error",
        title: "保存失败",
        description: messageFromError(error),
      });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (deleting === "batch")
        return apiClient.delete<unknown, { ids: EntityId[] }>(endpoint, {
          body: { ids: [...selected] as EntityId[] },
        });
      if (deleting)
        return apiClient.delete<unknown>(`${endpoint}/${deleting.id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({
        tone: "success",
        title: `${deleting === "batch" ? "批量删除" : "删除"}成功`,
      });
      setDeleting(null);
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
      apiClient.patch<T, { activate: boolean }>(
        `${endpoint}/${item.id}/status`,
        { activate: !item.activate },
      ),
    onSuccess: async (_, item) => {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({
        tone: "success",
        title: `${item.name}已${item.activate ? "禁用" : "启用"}`,
      });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "状态更新失败",
        description: messageFromError(error),
      }),
  });

  function openEditor(item: T | "new") {
    setEditing(item);
    setValues(item === "new" ? createInitial : toForm(item));
    setErrors({});
  }

  function submit() {
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const value = values[field.name];
      if (
        field.required &&
        (value === undefined || String(value).trim() === "")
      )
        nextErrors[field.name] = `请填写${field.label}`;
      const custom =
        value !== undefined ? field.validate?.(value, values) : undefined;
      if (custom) nextErrors[field.name] = custom;
    });
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) save.mutate();
  }

  const deletingItem: T | null =
    deleting !== null && deleting !== "batch" ? deleting : null;

  const columns: DataTableColumn<T>[] = [
      {
        key: "name",
        header: "名称",
        sortable: true,
        cell: (item) => (
          <div className="table-primary">
            <strong>{item.name}</strong>
            <small>ID: {item.id}</small>
          </div>
        ),
      },
      ...extraColumns,
      {
        key: "sort",
        header: "排序",
        sortable: true,
        width: 88,
        cell: (item) => item.sort ?? "—",
      },
      {
        key: "status",
        header: "状态",
        width: 100,
        cell: (item) => (
          <StatusBadge
            status={item.activate === false ? "disabled" : "active"}
          />
        ),
      },
      {
        key: "updated_at",
        header: "更新时间",
        sortable: true,
        hideBelow: "tablet",
        cell: (item) => formatDate(item.updated_at || item.created_at),
      },
      {
        key: "actions",
        header: "操作",
        width: 150,
        align: "right",
        cell: (item) => (
          <div
            className="table-actions"
            onClick={(event) => event.stopPropagation()}
          >
            {item.activate !== undefined && (
              <Button
                size="icon"
                variant="ghost"
                title={item.activate ? "禁用" : "启用"}
                onClick={() => setStatusItem(item)}
              >
                <Power />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              title="编辑"
              onClick={() => openEditor(item)}
            >
              <Edit3 />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="删除"
              className="danger-action"
              onClick={() => setDeleting(item)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button leftIcon={<Plus />} onClick={() => openEditor("new")}>
            新增{singular}
          </Button>
        }
      />
      {apiNote}
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
              onClick={() => setDeleting("batch")}
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
          <option value="active">已启用</option>
          <option value="disabled">已禁用</option>
        </select>
      </FilterBar>
      <DataTable
        columns={columns}
        data={list.data?.items ?? []}
        rowKey={(item) => item.id}
        loading={list.isLoading}
        error={list.isError ? messageFromError(list.error) : null}
        onRetry={() => void list.refetch()}
        selectedKeys={selected}
        onSelectionChange={setSelected}
        sort={
          query.sort
            ? { key: query.sort, direction: query.order ?? "asc" }
            : undefined
        }
        onSortChange={(sort) =>
          update({ sort: sort.key, order: sort.direction }, true)
        }
        emptyTitle={`暂无${singular}`}
        emptyDescription="可通过右上角按钮创建第一条数据。"
        emptyAction={
          <Button leftIcon={<Plus />} onClick={() => openEditor("new")}>
            新增{singular}
          </Button>
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
      <Modal
        open={editing !== null}
        onClose={() => !save.isPending && setEditing(null)}
        title={`${editing === "new" ? "新增" : "编辑"}${singular}`}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() => setEditing(null)}
            >
              取消
            </Button>
            <Button loading={save.isPending} onClick={submit}>
              保存
            </Button>
          </>
        }
      >
        <div className="form-grid">
          {fields.map((field) => (
            <div
              className={`field ${field.full ? "field--full" : ""}`}
              key={field.name}
            >
              <label htmlFor={`resource-${field.name}`}>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={`resource-${field.name}`}
                  className="textarea"
                  value={String(values[field.name] ?? "")}
                  onChange={(event) =>
                    setValues((state) => ({
                      ...state,
                      [field.name]: event.target.value,
                    }))
                  }
                  aria-invalid={Boolean(errors[field.name])}
                />
              ) : field.type === "select" ? (
                <select
                  id={`resource-${field.name}`}
                  className="select"
                  value={String(values[field.name] ?? "")}
                  onChange={(event) =>
                    setValues((state) => ({
                      ...state,
                      [field.name]: event.target.value,
                    }))
                  }
                >
                  {field.options?.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="checkbox">
                  <input
                    id={`resource-${field.name}`}
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(event) =>
                      setValues((state) => ({
                        ...state,
                        [field.name]: event.target.checked,
                      }))
                    }
                  />
                  启用
                </label>
              ) : (
                <input
                  id={`resource-${field.name}`}
                  className="input"
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={String(values[field.name] ?? "")}
                  onChange={(event) =>
                    setValues((state) => ({
                      ...state,
                      [field.name]:
                        field.type === "number"
                          ? Number(event.target.value)
                          : event.target.value,
                    }))
                  }
                  aria-invalid={Boolean(errors[field.name])}
                />
              )}
              {errors[field.name] && (
                <span className="field-error">{errors[field.name]}</span>
              )}
              {field.hint && <span className="field-hint">{field.hint}</span>}
            </div>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !remove.isPending && setDeleting(null)}
        onConfirm={() => remove.mutateAsync()}
        loading={remove.isPending}
        title={
          deleting === "batch"
            ? `删除 ${selected.size} 条数据？`
            : `删除“${deletingItem?.name ?? ""}”？`
        }
        description="删除后通常无法恢复，请确认关联内容已被妥善处理。"
        impact={
          deletingItem ? impact?.(deletingItem) : undefined
        }
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
        danger={statusItem?.activate === true}
        title={`${statusItem?.activate ? "禁用" : "启用"}${singular}？`}
        description={`状态变更会立即影响“${statusItem?.name ?? ""}”在前台的可用性。`}
        confirmLabel="确认变更"
      />
    </>
  );
}
