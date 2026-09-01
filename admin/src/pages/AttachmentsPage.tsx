import { useEffect, useRef, useState, type Key } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  File,
  Link2,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { useToast } from "../components/Toast";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useListParams } from "../hooks/useListParams";
import { apiClient } from "../lib/api";
import { formatBytes, formatDate } from "../lib/format";
import { messageFromError, normalizePage } from "../lib/normalize";
import type { Attachment, EntityId } from "../types/content";
import { endpoints } from "../types/content";

export function AttachmentsPage() {
  const { query, update } = useListParams({
    sort: "created_at",
    order: "desc",
    size: 20,
  });
  const [search, setSearch] = useState(query.search ?? "");
  const debounced = useDebouncedValue(search);
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [renaming, setRenaming] = useState<Attachment | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Attachment | "batch" | null>(null);
  const [uploads, setUploads] = useState<
    Array<{ name: string; progress: number; error?: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useEffect(() => update({ search: debounced }, true), [debounced, update]);
  const list = useQuery({
    queryKey: ["attachments", query],
    queryFn: async ({ signal }) =>
      normalizePage<Attachment>(
        await apiClient.get<unknown>(endpoints.attachments, { query, signal }),
        ["items", "attachments", "files"],
        { page: query.page, size: query.size },
      ),
    placeholderData: (value) => value,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["attachments"] });
  const remove = useMutation({
    mutationFn: () =>
      deleting === "batch"
        ? apiClient.delete<unknown, { ids: EntityId[] }>(
            endpoints.attachments,
            { body: { ids: [...selected] as EntityId[] } },
          )
        : apiClient.delete<unknown>(
            `${endpoints.attachments}/${deleting && deleting.id}`,
          ),
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
      setSelected(new Set());
      toast({ tone: "success", title: "附件已删除" });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "删除失败",
        description: messageFromError(error),
      }),
  });
  const rename = useMutation({
    mutationFn: () =>
      apiClient.patch<Attachment, { name: string }>(
        `${endpoints.attachments}/${renaming?.id}`,
        { name: name.trim() },
      ),
    onSuccess: async () => {
      await refresh();
      setRenaming(null);
      toast({ tone: "success", title: "附件已重命名" });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "重命名失败",
        description: messageFromError(error),
      }),
  });
  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      setUploads((items) => [...items, { name: file.name, progress: 0 }]);
      try {
        await apiClient.upload<Attachment>(endpoints.attachments, file, {
          onProgress: (progress) =>
            setUploads((items) =>
              items.map((item) =>
                item.name === file.name
                  ? { ...item, progress: progress.percent ?? 0 }
                  : item,
              ),
            ),
        });
        setUploads((items) => items.filter((item) => item.name !== file.name));
        toast({ tone: "success", title: `${file.name} 上传成功` });
      } catch (error) {
        setUploads((items) =>
          items.map((item) =>
            item.name === file.name
              ? { ...item, error: messageFromError(error) }
              : item,
          ),
        );
        toast({
          tone: "error",
          title: `${file.name} 上传失败`,
          description: messageFromError(error),
        });
      }
    }
    await refresh();
    if (inputRef.current) inputRef.current.value = "";
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "地址已复制" });
    } catch {
      toast({
        tone: "error",
        title: "复制失败",
        description: "浏览器未授权剪贴板访问。",
      });
    }
  }
  const columns: DataTableColumn<Attachment>[] = [
      {
        key: "name",
        header: "附件",
        sortable: true,
        cell: (item) => (
          <div className="attachment-cell">
            <span>
              {item.mime_type.startsWith("image/") ? (
                <img src={item.url} alt="" loading="lazy" />
              ) : (
                <File />
              )}
            </span>
            <div>
              <strong>{item.name}</strong>
              <small>
                {item.mime_type} · {formatBytes(item.size)}
              </small>
            </div>
          </div>
        ),
      },
      {
        key: "references",
        header: "关联",
        cell: (item) =>
          item.references?.length ? (
            <button
              className="reference-count"
              onClick={() => setPreview(item)}
            >
              <Link2 />
              {item.references.length} 处
            </button>
          ) : (
            <span className="muted">未关联</span>
          ),
      },
      {
        key: "uploader",
        header: "上传者",
        hideBelow: "desktop",
        cell: (item) =>
          typeof item.uploader === "string"
            ? item.uploader
            : item.uploader?.nickname || "—",
      },
      {
        key: "created_at",
        header: "上传时间",
        sortable: true,
        hideBelow: "tablet",
        cell: (item) => formatDate(item.created_at),
      },
      {
        key: "actions",
        header: "操作",
        align: "right",
        width: 180,
        cell: (item) => (
          <div className="table-actions">
            <Button
              size="icon"
              variant="ghost"
              title="预览"
              onClick={() => setPreview(item)}
            >
              <Eye />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="复制地址"
              onClick={() => void copy(item.url)}
            >
              <Copy />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="重命名"
              onClick={() => {
                setRenaming(item);
                setName(item.name);
              }}
            >
              <Pencil />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="danger-action"
              title="删除"
              onClick={() => setDeleting(item)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
  ];
  const deleteRefs =
    deleting && deleting !== "batch" ? (deleting.references ?? []) : [];
  const deleteName = deleting && deleting !== "batch" ? deleting.name : "";
  return (
    <>
      <PageHeader
        title="附件管理"
        description="上传、检索、预览附件并检查内容引用。"
        actions={
          <>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) => void uploadFiles(event.target.files)}
            />
            <Button
              leftIcon={<UploadCloud />}
              onClick={() => inputRef.current?.click()}
            >
              上传附件
            </Button>
          </>
        }
      />
      {uploads.length > 0 && (
        <section className="upload-queue">
          {uploads.map((item) => (
            <div key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.error || `${item.progress}%`}</span>
              </div>
              <progress max={100} value={item.progress} />
            </div>
          ))}
        </section>
      )}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索附件名称…"
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
          value={String(query.type ?? "")}
          onChange={(event) =>
            update({ type: event.target.value } as never, true)
          }
        >
          <option value="">全部类型</option>
          <option value="image">图片</option>
          <option value="document">文档</option>
          <option value="other">其他</option>
        </select>
        <select
          value={String(query.referenced ?? "")}
          onChange={(event) =>
            update({ referenced: event.target.value } as never, true)
          }
        >
          <option value="">全部关联</option>
          <option value="true">已关联</option>
          <option value="false">未关联</option>
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
        emptyTitle="附件库为空"
        emptyDescription="上传图片或文件后，会在这里展示。"
        emptyAction={
          <Button leftIcon={<Plus />} onClick={() => inputRef.current?.click()}>
            上传附件
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
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name || "附件预览"}
        size="lg"
      >
        <div className="attachment-preview">
          {preview?.mime_type.startsWith("image/") ? (
            <img src={preview.url} alt={preview.name} />
          ) : (
            <div className="file-preview">
              <File />
              <a href={preview?.url} target="_blank" rel="noreferrer">
                在新窗口打开文件
              </a>
            </div>
          )}
          <dl>
            <div>
              <dt>地址</dt>
              <dd>{preview?.url}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>{preview?.mime_type}</dd>
            </div>
            <div>
              <dt>大小</dt>
              <dd>{formatBytes(preview?.size)}</dd>
            </div>
          </dl>
          <h3>关联对象</h3>
          {preview?.references?.length ? (
            <div className="reference-list">
              {preview.references.map((ref) =>
                ref.url ? (
                  <a href={ref.url} key={`${ref.type}-${ref.id}`}>
                    {ref.type} · {ref.title}
                  </a>
                ) : (
                  <span key={`${ref.type}-${ref.id}`}>
                    {ref.type} · {ref.title}
                  </span>
                ),
              )}
            </div>
          ) : (
            <p className="muted">此附件未关联内容。</p>
          )}
        </div>
      </Modal>
      <Modal
        open={renaming !== null}
        onClose={() => !rename.isPending && setRenaming(null)}
        title="重命名附件"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              取消
            </Button>
            <Button
              loading={rename.isPending}
              disabled={!name.trim()}
              onClick={() => rename.mutate()}
            >
              保存
            </Button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="attachment-name">文件名</label>
          <input
            id="attachment-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !remove.isPending && setDeleting(null)}
        onConfirm={() => remove.mutateAsync()}
        loading={remove.isPending}
        title={
          deleting === "batch"
            ? `删除所选 ${selected.size} 个附件？`
            : `删除“${deleteName}”？`
        }
        description={
          deleteRefs.length
            ? `该附件正在被 ${deleteRefs.length} 个对象使用，删除将产生失效链接。`
            : "删除后文件地址将永久失效。"
        }
        impact={
          deleteRefs.length ? (
            <ul>
              {deleteRefs.slice(0, 5).map((ref) => (
                <li key={`${ref.type}-${ref.id}`}>
                  {ref.type}：{ref.title}
                </li>
              ))}
            </ul>
          ) : undefined
        }
        confirmLabel="确认删除"
      />
    </>
  );
}
