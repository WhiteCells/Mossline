import { FieldLabel } from "../../shared/ui/FieldLabel";
import { useEffect, useMemo, useState, type Key } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../../shared/ui/DataTable";
import { FilterBar } from "../../shared/ui/FilterBar";
import { Modal } from "../../shared/ui/Modal";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Pagination } from "../../shared/ui/Pagination";
import { useToast } from "../../shared/ui/Toast";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { useListParams } from "../../shared/hooks/useListParams";
import { apiClient } from "../../shared/api/api";
import { formatDate, getInitials } from "../../shared/utils/format";
import {
  getFieldErrors,
  messageFromError,
  normalizePage,
} from "../../shared/utils/normalize";
import type { EntityId, UserSummary } from "../../shared/types/content";
import { apiPaths } from "../../shared/api/paths";
import { StatusBadge } from "../../shared/content/status";

interface UserForm {
  username: string;
  nickname: string;
  email: string;
  role: string;
  status: string;
  password: string;
  avatar: string;
}
const emptyForm: UserForm = {
  username: "",
  nickname: "",
  email: "",
  role: "editor",
  status: "active",
  password: "",
  avatar: "",
};

export function UsersPage() {
  const { query, update } = useListParams({
    sort: "created_at",
    order: "desc",
  });
  const [search, setSearch] = useState(query.search ?? "");
  const debounced = useDebouncedValue(search);
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  const [editing, setEditing] = useState<UserSummary | "new" | null>(null);
  const [deleting, setDeleting] = useState<UserSummary | "batch" | null>(null);
  const [statusUser, setStatusUser] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useEffect(() => update({ search: debounced }, true), [debounced, update]);

  const list = useQuery({
    queryKey: ["users", query],
    queryFn: async ({ signal }) =>
      normalizePage<UserSummary>(
        await apiClient.get<unknown>(apiPaths.users, { query, signal }),
        ["items", "users"],
        { page: query.page, size: query.size },
      ),
    placeholderData: (value) => value,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const save = useMutation({
    mutationFn: () => {
      const payload: Partial<UserForm> = { ...form };
      if (editing !== "new" && !payload.password) delete payload.password;
      return editing === "new"
        ? apiClient.post<UserSummary, Partial<UserForm>>(
            apiPaths.users,
            payload,
          )
        : apiClient.put<UserSummary, Partial<UserForm>>(
            `${apiPaths.users}/${editing?.id}`,
            payload,
          );
    },
    onSuccess: async () => {
      await refresh();
      toast({
        tone: "success",
        title: editing === "new" ? "用户已创建" : "用户已更新",
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
    mutationFn: () =>
      deleting === "batch"
        ? apiClient.delete<unknown, { ids: EntityId[] }>(apiPaths.users, {
            body: { ids: [...selected] as EntityId[] },
          })
        : apiClient.delete<unknown>(
            `${apiPaths.users}/${deleting && deleting.id}`,
          ),
    onSuccess: async () => {
      await refresh();
      toast({ tone: "success", title: "删除成功" });
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
    mutationFn: (user: UserSummary) =>
      apiClient.patch<UserSummary, { status: string }>(
        `${apiPaths.users}/${user.id}/status`,
        { status: user.status === "active" ? "disabled" : "active" },
      ),
    onSuccess: async () => {
      await refresh();
      toast({ tone: "success", title: "用户状态已更新" });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "状态更新失败",
        description: messageFromError(error),
      }),
  });

  function open(user: UserSummary | "new") {
    setEditing(user);
    setErrors({});
    setForm(
      user === "new"
        ? emptyForm
        : {
            username: user.username ?? "",
            nickname: user.nickname,
            email: user.email,
            role: user.role,
            status: user.status,
            password: "",
            avatar: user.avatar ?? "",
          },
    );
  }
  function submit() {
    const next: Record<string, string> = {};
    if (!form.username.trim()) next.username = "请输入用户名";
    if (!form.nickname.trim()) next.nickname = "请输入昵称";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "请输入有效邮箱";
    if (editing === "new" && form.password.length < 8)
      next.password = "初始密码至少 8 位";
    if (editing !== "new" && form.password && form.password.length < 8)
      next.password = "新密码至少 8 位";
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  }

  const columns = useMemo<DataTableColumn<UserSummary>[]>(
    () => [
      {
        key: "nickname",
        header: "用户",
        sortable: true,
        cell: (user) => (
          <div className="user-cell">
            <span>
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                getInitials(user.nickname)
              )}
            </span>
            <div>
              <strong>{user.nickname}</strong>
              <small>@{user.username || user.id}</small>
            </div>
          </div>
        ),
      },
      {
        key: "email",
        header: "邮箱",
        hideBelow: "tablet",
        cell: (user) => user.email,
      },
      {
        key: "role",
        header: "角色",
        cell: (user) => <span className="role-chip">{user.role}</span>,
      },
      {
        key: "status",
        header: "状态",
        cell: (user) => <StatusBadge status={user.status} />,
      },
      {
        key: "created_at",
        header: "创建时间",
        sortable: true,
        hideBelow: "desktop",
        cell: (user) => formatDate(user.created_at),
      },
      {
        key: "actions",
        header: "操作",
        align: "right",
        width: 150,
        cell: (user) => (
          <div className="table-actions">
            <Button
              size="icon"
              variant="ghost"
              title={user.status === "active" ? "禁用" : "启用"}
              onClick={() => setStatusUser(user)}
            >
              <Power />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="编辑"
              onClick={() => open(user)}
            >
              <Edit3 />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="danger-action"
              title="删除"
              onClick={() => setDeleting(user)}
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
        title="用户管理"
        description="管理后台账号、角色和启用状态。"
        actions={
          <Button leftIcon={<Plus />} onClick={() => open("new")}>
            新增用户
          </Button>
        }
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="搜索昵称、用户名或邮箱…"
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
        <select
          value={String(query.role ?? "")}
          onChange={(event) =>
            update({ role: event.target.value } as never, true)
          }
        >
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="editor">编辑</option>
        </select>
      </FilterBar>
      <DataTable
        columns={columns}
        data={list.data?.items ?? []}
        rowKey={(user) => user.id}
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
        emptyTitle="暂无用户"
        emptyDescription="创建首个可登录的管理账号。"
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
        title={editing === "new" ? "新增用户" : "编辑用户"}
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
          {(
            [
              ["username", "用户名", "text"],
              ["nickname", "昵称", "text"],
              ["email", "邮箱", "email"],
              ["avatar", "头像地址", "url"],
              [
                "password",
                editing === "new" ? "初始密码" : "重置密码",
                "password",
              ],
            ] as const
          ).map(([key, label, type]) => (
            <div
              className={`field ${key === "password" ? "field--full" : ""}`}
              key={key}
            >
              <FieldLabel htmlFor={`user-${key}`}>
                {label}
                {["username", "nickname", "email"].includes(key) && (
                  <span className="required">*</span>
                )}
              </FieldLabel>
              <input
                id={`user-${key}`}
                className="input"
                type={type}
                value={form[key]}
                onChange={(event) =>
                  setForm((value) => ({ ...value, [key]: event.target.value }))
                }
                aria-invalid={Boolean(errors[key])}
              />
              {errors[key] && (
                <span className="field-error">{errors[key]}</span>
              )}
              {key === "password" && editing !== "new" && (
                <span className="field-hint">留空表示不修改密码。</span>
              )}
            </div>
          ))}
          <div className="field">
            <FieldLabel htmlFor="user-role">角色</FieldLabel>
            <select
              id="user-role"
              className="select"
              value={form.role}
              onChange={(event) =>
                setForm((value) => ({ ...value, role: event.target.value }))
              }
            >
              <option value="admin">管理员</option>
              <option value="editor">编辑</option>
            </select>
          </div>
          <div className="field">
            <FieldLabel htmlFor="user-status">状态</FieldLabel>
            <select
              id="user-status"
              className="select"
              value={form.status}
              onChange={(event) =>
                setForm((value) => ({ ...value, status: event.target.value }))
              }
            >
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !remove.isPending && setDeleting(null)}
        onConfirm={() => remove.mutateAsync()}
        loading={remove.isPending}
        title={
          deleting === "batch"
            ? `删除 ${selected.size} 个用户？`
            : "删除该用户？"
        }
        description="用户删除后可能影响文章作者、审计记录和附件归属。服务端应拒绝删除当前登录用户及最后一个管理员。"
        confirmLabel="确认删除"
      />
      <ConfirmDialog
        open={statusUser !== null}
        onClose={() => !toggle.isPending && setStatusUser(null)}
        onConfirm={async () => {
          if (statusUser) await toggle.mutateAsync(statusUser);
          setStatusUser(null);
        }}
        loading={toggle.isPending}
        danger={statusUser?.status === "active"}
        title={
          statusUser?.status === "active" ? "禁用该用户？" : "启用该用户？"
        }
        description={
          statusUser?.status === "active"
            ? "禁用后该用户将无法继续登录管理端。"
            : "启用后该用户将恢复其角色对应的管理权限。"
        }
        confirmLabel="确认变更"
      />
    </>
  );
}
