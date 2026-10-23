import { FieldLabel } from "../../shared/ui/FieldLabel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, Monitor, Save, Smartphone, Upload } from "lucide-react";
import { apiClient } from "../../shared/api/api";
import { apiPaths } from "../../shared/api/paths";
import {
  AttachmentPicker,
  createAttachmentUploader,
  createUniqueUploadFile,
} from "../../shared/editor";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ErrorState, LoadingState } from "../../shared/ui/States";
import { useToast } from "../../shared/ui/Toast";
import type { Attachment } from "../../shared/types/content";
import { messageFromError, normalizePage } from "../../shared/utils/normalize";

interface Appearance {
  desktop_background_url: string;
  mobile_background_url: string;
  overlay_enabled: boolean;
}
type BackgroundField = "desktop_background_url" | "mobile_background_url";
const queryKey = ["site-appearance"];
const uploadAttachment = createAttachmentUploader();

export function AppearancePage() {
  const { user } = useAuth();
  const page = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      apiClient.get<Appearance>(apiPaths.appearance, { signal }),
    refetchOnWindowFocus: false,
  });
  if (page.isPending) return <LoadingState label="正在加载外观设置…" />;
  if (page.isError)
    return (
      <ErrorState
        title="外观设置加载失败"
        description={messageFromError(page.error)}
        onRetry={() => void page.refetch()}
      />
    );
  return (
    <AppearanceForm
      initial={page.data}
      canEdit={
        user?.role === "admin" || user?.roles?.includes("admin") === true
      }
    />
  );
}

function AppearanceForm({
  initial,
  canEdit,
}: {
  initial: Appearance;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [picker, setPicker] = useState<BackgroundField | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [uploading, setUploading] = useState<BackgroundField | null>(null);
  const [failedURL, setFailedURL] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const relationKey = useMemo(() => crypto.randomUUID(), []);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useEffect(() => () => controller.current?.abort(), []);
  const attachments = useQuery({
    queryKey: ["attachments", "appearance", librarySearch],
    enabled: picker !== null,
    queryFn: async ({ signal }) =>
      normalizePage<Attachment>(
        await apiClient.get<unknown>(apiPaths.attachments, {
          query: { page: 1, size: 200, type: "image", search: librarySearch },
          signal,
        }),
        ["items", "attachments", "files"],
        { page: 1, size: 200 },
      ).items,
  });
  const save = useMutation({
    mutationFn: (next: Appearance) =>
      apiClient.put<Appearance>(apiPaths.appearance, {
        ...next,
        attachment_relation_key: relationKey,
      }),
    onSuccess: (data) => {
      setSaved(data);
      setValue(data);
      queryClient.setQueryData(queryKey, data);
      void queryClient.invalidateQueries({ queryKey: ["attachments"] });
      toast({
        tone: "success",
        title: "外观设置已保存",
        description: "首页背景与蒙版已更新。",
      });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "保存失败",
        description: messageFromError(error),
      }),
  });
  const busy = uploading !== null || save.isPending;
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const previewURL =
    device === "mobile"
      ? value.mobile_background_url || value.desktop_background_url
      : value.desktop_background_url;
  const updateURL = (field: BackgroundField, url: string) => {
    setFailedURL(null);
    setValue((current) => ({ ...current, [field]: url }));
  };
  async function upload(field: BackgroundField, file: File) {
    const uploadController = new AbortController();
    controller.current = uploadController;
    setUploading(field);
    try {
      const item = await uploadAttachment({
        file: createUniqueUploadFile(file),
        owner: { type: "site", relationKey },
        signal: uploadController.signal,
        onProgress: () => {},
      });
      updateURL(field, item.url);
      void attachments.refetch();
    } catch (error) {
      if (!uploadController.signal.aborted)
        toast({
          tone: "error",
          title: "图片上传失败",
          description: messageFromError(error),
        });
    } finally {
      if (!uploadController.signal.aborted) setUploading(null);
    }
  }
  return (
    <>
      <PageHeader
        title="外观设置"
        description="为首页选择背景图片，调整不同设备的显示与蒙版效果。"
        actions={
          <Button
            leftIcon={<Save />}
            disabled={!canEdit || !dirty || uploading !== null}
            loading={save.isPending}
            onClick={() =>
              save.mutate({
                ...value,
                desktop_background_url: value.desktop_background_url.trim(),
                mobile_background_url: value.mobile_background_url.trim(),
              })
            }
          >
            保存设置
          </Button>
        }
      />
      {!canEdit && (
        <p className="field-hint" role="status">
          只有管理员可以修改外观设置。
        </p>
      )}
      <div className="appearance-layout">
        <div className="form-stack">
          {(
            [
              {
                field: "desktop_background_url",
                title: "桌面端背景",
                hint: "建议使用横向图片，宽度不小于 1920 像素。留空显示默认插画。",
                icon: Monitor,
              },
              {
                field: "mobile_background_url",
                title: "手机端背景",
                hint: "建议使用竖向图片。留空时沿用桌面端背景。",
                icon: Smartphone,
              },
            ] as const
          ).map(({ field, title, hint, icon: DeviceIcon }) => (
            <section className="form-section" key={field}>
              <h2 className="form-section-title appearance-field-title">
                <DeviceIcon size={18} />
                {title}
              </h2>
              <div className="field">
                <FieldLabel htmlFor={field}>图片地址</FieldLabel>
                <input
                  className="input"
                  id={field}
                  type="text"
                  maxLength={1000}
                  placeholder="输入图片网址，或从下方上传 / 选择"
                  value={value[field]}
                  disabled={!canEdit || busy}
                  onChange={(event) => updateURL(field, event.target.value)}
                />
                <p className="field-hint">{hint} 图片将居中裁切铺满首屏。</p>
              </div>
              <div className="appearance-image-actions">
                <label
                  className={`ui-button ui-button--outline ui-button--sm appearance-upload${!canEdit || busy ? " is-disabled" : ""}`}
                >
                  <Upload size={15} />
                  {uploading === field ? "正在上传…" : "上传图片"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={!canEdit || busy}
                    aria-label={`上传${title}图片`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void upload(field, file);
                    }}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Image size={15} />}
                  disabled={!canEdit || busy}
                  onClick={() => setPicker(field)}
                >
                  从附件库选择
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canEdit || busy || !value[field]}
                  onClick={() => updateURL(field, "")}
                >
                  清除
                </Button>
              </div>
            </section>
          ))}
          <section className="form-section">
            <h2 className="form-section-title">背景蒙版</h2>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={value.overlay_enabled}
                disabled={!canEdit || busy}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    overlay_enabled: event.target.checked,
                  }))
                }
              />
              启用点状蒙版
            </label>
            <p className="field-hint">
              在背景上叠加细密的点状纹理，让背景更柔和。关闭后显示原图。
            </p>
          </section>
        </div>
        <aside className="form-section appearance-preview-panel">
          <div className="appearance-preview-heading">
            <h2 className="form-section-title">效果预览</h2>
            <div
              className="appearance-device-switch"
              role="group"
              aria-label="预览设备"
            >
              <Button
                size="icon"
                variant={device === "desktop" ? "secondary" : "ghost"}
                aria-label="预览桌面端"
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Monitor size={17} />
              </Button>
              <Button
                size="icon"
                variant={device === "mobile" ? "secondary" : "ghost"}
                aria-label="预览手机端"
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone size={17} />
              </Button>
            </div>
          </div>
          <div
            className={`appearance-preview is-${device}${value.overlay_enabled ? " has-overlay" : ""}`}
          >
            {previewURL && failedURL !== previewURL && (
              <img
                src={previewURL}
                alt="首页背景预览"
                onError={() => setFailedURL(previewURL)}
              />
            )}
            <div className="appearance-preview-mask" />
            <span className="appearance-preview-brand">Mossline</span>
            <div className="appearance-preview-copy">
              <strong>Mossline</strong>
              <span>时间留下的痕迹</span>
            </div>
          </div>
          {previewURL && failedURL === previewURL && (
            <p className="field-error" role="status">
              图片暂时无法加载，请检查地址。前台会自动显示默认插画。
            </p>
          )}
          <p className="field-hint">
            {dirty
              ? "预览尚未保存，点击「保存设置」后生效。"
              : "当前显示已保存的设置。"}
          </p>
          <a
            className="appearance-home-link"
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            打开前台首页 ↗
          </a>
        </aside>
      </div>
      <AttachmentPicker
        title="选择背景图片"
        description="选择一张图片作为首页背景，保存设置后生效。"
        onSearch={setLibrarySearch}
        open={picker !== null}
        items={(attachments.data ?? [])
          .filter((item) => item.mime_type?.startsWith("image/"))
          .map((item) => ({
            id: String(item.id),
            name: item.name,
            url: item.url,
            mimeType: item.mime_type,
            size: item.size,
          }))}
        loading={attachments.isPending}
        error={attachments.isError ? messageFromError(attachments.error) : null}
        onClose={() => setPicker(null)}
        onRefresh={() => void attachments.refetch()}
        onSelect={(item) => {
          if (picker) updateURL(picker, item.url);
          setPicker(null);
        }}
      />
    </>
  );
}
