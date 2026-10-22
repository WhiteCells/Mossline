import {
  Bold,
  CheckSquare,
  Code2,
  Columns2,
  Eye,
  FileCode2,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Library,
  Link,
  List,
  ListOrdered,
  LoaderCircle,
  MessageSquareQuote,
  Pencil,
  Redo2,
  Sigma,
  Table2,
  Undo2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AttachmentPicker } from "./AttachmentPicker";
import { MarkdownPreview } from "./MarkdownPreview";
import type {
  AttachmentLibraryConfig,
  AttachmentLibraryItem,
  AttachmentOwner,
  EditorMode,
  UploadAttachment,
  UploadedAttachment,
} from "./types";
import {
  createAttachmentUploader,
  createUniqueUploadFile,
  renameFile,
} from "./upload";
import "./markdown-editor.css";

type UploadStatus = "preparing" | "uploading" | "failed";

interface UploadTask {
  id: string;
  file: File;
  draftName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}

interface InsertTemplate {
  before: string;
  after?: string;
  placeholder?: string;
  lineStart?: boolean;
}

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** 保存成功后更新此值，用于清除编辑器的未保存标记 */
  savedValue?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onAutoSave?: (value: string) => void | Promise<void>;
  autoSaveDelay?: number;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  minHeight?: number;
  defaultMode?: EditorMode;
  id?: string;
  owner?: AttachmentOwner;
  uploadAttachment?: UploadAttachment;
  attachmentLibrary?: AttachmentLibraryConfig;
  onAttachmentUploaded?: (attachment: UploadedAttachment) => void;
  onUploadError?: (error: Error, file: File) => void;
  confirmLeaveMessage?: string;
  className?: string;
}

const isImage = (file: File) => file.type.startsWith("image/");

const attachmentMarkdown = (
  attachment: Pick<UploadedAttachment, "name" | "url" | "mimeType">,
) => {
  const safeName = attachment.name.replace(/[[\]]/g, "\\$&");
  const safeUrl = attachment.url.replace(/[()\s]/g, (character) =>
    character === " " ? "%20" : `\\${character}`,
  );
  const image =
    attachment.mimeType?.startsWith("image/") === true ||
    /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(attachment.url);
  return image ? `![${safeName}](${safeUrl})` : `[${safeName}](${safeUrl})`;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "附件上传失败，请稍后重试";

/** 受控 Markdown 编辑器，集中处理格式插入、图片上传和未保存提醒 */
export function MarkdownEditor({
  value,
  onChange,
  savedValue,
  onDirtyChange,
  onAutoSave,
  autoSaveDelay = 1500,
  label = "正文",
  placeholder = "使用 Markdown 开始写作…",
  disabled = false,
  required = false,
  error,
  minHeight = 520,
  defaultMode = "split",
  id = "markdown-editor-input",
  owner,
  uploadAttachment,
  attachmentLibrary,
  onAttachmentUploaded,
  onUploadError,
  confirmLeaveMessage = "当前内容尚未保存，确定要离开吗？",
  className = "",
}: MarkdownEditorProps) {
  const initialValue = useRef(savedValue ?? value);
  const valueRef = useRef(value);
  valueRef.current = value;
  const cleanValue = savedValue ?? initialValue.current;
  const dirty = value !== cleanValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef(new Map<string, AbortController>());
  const [mode, setMode] = useState<EditorMode>(defaultMode);
  const [dragging, setDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const uploader = useMemo(
    () => uploadAttachment ?? createAttachmentUploader(),
    [uploadAttachment],
  );

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty || disabled) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (
        link.target === "_blank" ||
        link.download ||
        link.href === window.location.href ||
        link.getAttribute("href")?.startsWith("#")
      ) {
        return;
      }
      if (!window.confirm(confirmLeaveMessage)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [confirmLeaveMessage, dirty, disabled]);

  useEffect(() => {
    if (!onAutoSave || !dirty || disabled) return;
    const timer = window.setTimeout(() => {
      Promise.resolve(onAutoSave(value)).catch((caught: unknown) => {
        setAnnouncement(`自动保存失败：${errorMessage(caught)}`);
      });
    }, autoSaveDelay);
    return () => window.clearTimeout(timer);
  }, [autoSaveDelay, dirty, disabled, onAutoSave, value]);

  useEffect(() => {
    const controllers = abortControllers.current;
    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    };
  }, []);

  const setTask = useCallback(
    (id: string, update: (task: UploadTask) => UploadTask) => {
      setUploadTasks((tasks) =>
        tasks.map((task) => (task.id === id ? update(task) : task)),
      );
    },
    [],
  );

  // 在指定位置或当前选区插入正文，补全换行并在渲染后恢复光标
  const insertText = useCallback(
    (text: string, position?: number) => {
      const textarea = textareaRef.current;
      const currentValue = valueRef.current;
      const start = position ?? textarea?.selectionStart ?? currentValue.length;
      const end = position ?? textarea?.selectionEnd ?? start;
      const prefix = start > 0 && currentValue[start - 1] !== "\n" ? "\n" : "";
      const suffix =
        start < currentValue.length && currentValue[start] !== "\n" ? "\n" : "";
      const insertion = `${prefix}${text}${suffix}`;
      const nextValue = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`;
      valueRef.current = nextValue;
      onChange(nextValue);
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        const cursor = start + insertion.length;
        textareaRef.current?.setSelectionRange(cursor, cursor);
      });
    },
    [onChange],
  );

  // 为选中文本套用 Markdown 模板，无选区时使用占位文本并选中它
  const applyTemplate = useCallback(
    ({
      before,
      after = "",
      placeholder: fallback = "文本",
      lineStart,
    }: InsertTemplate) => {
      if (disabled) return;
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end) || fallback;
      const needsLineBreak =
        lineStart && start > 0 && value[start - 1] !== "\n";
      const prefix = needsLineBreak ? `\n${before}` : before;
      const replacement = `${prefix}${selected}${after}`;
      const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
      valueRef.current = nextValue;
      onChange(nextValue);
      window.requestAnimationFrame(() => {
        textarea.focus();
        const selectionStart = start + prefix.length;
        textarea.setSelectionRange(
          selectionStart,
          selectionStart + selected.length,
        );
      });
    },
    [disabled, onChange, value],
  );

  // 上传任务独立维护取消控制器，成功后插入附件，失败后保留任务供重试
  const startUpload = useCallback(
    async (task: UploadTask) => {
      if (disabled) return;
      const name = task.draftName.trim();
      if (!name) {
        setTask(task.id, (current) => ({
          ...current,
          error: "文件名不能为空",
          status: "failed",
        }));
        return;
      }

      const file =
        name === task.file.name ? task.file : renameFile(task.file, name);
      const controller = new AbortController();
      abortControllers.current.set(task.id, controller);
      setTask(task.id, (current) => ({
        ...current,
        file,
        status: "uploading",
        progress: 0,
        error: undefined,
      }));

      try {
        const attachment = await uploader({
          file,
          owner,
          signal: controller.signal,
          onProgress: (progress) =>
            setTask(task.id, (current) => ({ ...current, progress })),
        });
        abortControllers.current.delete(task.id);
        insertText(attachmentMarkdown(attachment));
        setUploadTasks((tasks) => tasks.filter((item) => item.id !== task.id));
        setAnnouncement(`${attachment.name} 上传成功并已插入正文`);
        onAttachmentUploaded?.(attachment);
      } catch (caught) {
        abortControllers.current.delete(task.id);
        if (caught instanceof DOMException && caught.name === "AbortError") {
          setUploadTasks((tasks) =>
            tasks.filter((item) => item.id !== task.id),
          );
          return;
        }
        const message = errorMessage(caught);
        setTask(task.id, (current) => ({
          ...current,
          status: "failed",
          error: message,
        }));
        setAnnouncement(`${file.name} 上传失败：${message}`);
        onUploadError?.(
          caught instanceof Error ? caught : new Error(message),
          file,
        );
      }
    },
    [
      disabled,
      insertText,
      onAttachmentUploaded,
      onUploadError,
      owner,
      setTask,
      uploader,
    ],
  );

  // 仅将图片加入队列，生成独立任务及文件名，并按入口决定是否立即上传
  const enqueueFiles = useCallback(
    (files: readonly File[], immediate: boolean) => {
      const images = files.filter(isImage);
      if (images.length === 0) {
        setAnnouncement("仅支持上传图片到正文");
        return;
      }
      const tasks = images.map((original): UploadTask => {
        const file = createUniqueUploadFile(original);
        return {
          id: crypto.randomUUID(),
          file,
          draftName: file.name,
          progress: 0,
          status: immediate ? "uploading" : "preparing",
        };
      });
      setUploadTasks((current) => [...current, ...tasks]);
      if (immediate) {
        for (const task of tasks) {
          // 上传函数负责实际状态更新和错误处理，此处无需重复捕获异常
          void startUpload({ ...task, status: "preparing" });
        }
      }
    },
    [startUpload],
  );

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    enqueueFiles(Array.from(event.target.files ?? []), false);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setDragging(false);
    enqueueFiles(Array.from(event.dataTransfer.files), true);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const images = Array.from(event.clipboardData.files).filter(isImage);
    if (images.length === 0) return;
    event.preventDefault();
    enqueueFiles(images, true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyTemplate({ before: "**", after: "**", placeholder: "粗体文本" });
    }
    if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyTemplate({ before: "*", after: "*", placeholder: "斜体文本" });
    }
  };

  const cancelTask = (id: string) => {
    abortControllers.current.get(id)?.abort();
    setUploadTasks((tasks) => tasks.filter((task) => task.id !== id));
  };

  const selectAttachment = (attachment: AttachmentLibraryItem) => {
    insertText(attachmentMarkdown(attachment));
    setPickerOpen(false);
    setAnnouncement(`${attachment.name} 已插入正文`);
  };

  const toolbar = [
    {
      label: "一级标题",
      icon: Heading1,
      template: { before: "# ", placeholder: "标题", lineStart: true },
    },
    {
      label: "二级标题",
      icon: Heading2,
      template: { before: "## ", placeholder: "标题", lineStart: true },
    },
    {
      label: "粗体（Ctrl+B）",
      icon: Bold,
      template: { before: "**", after: "**", placeholder: "粗体文本" },
    },
    {
      label: "斜体（Ctrl+I）",
      icon: Italic,
      template: { before: "*", after: "*", placeholder: "斜体文本" },
    },
    {
      label: "引用",
      icon: MessageSquareQuote,
      template: { before: "> ", placeholder: "引用内容", lineStart: true },
    },
    {
      label: "无序列表",
      icon: List,
      template: { before: "- ", placeholder: "列表项", lineStart: true },
    },
    {
      label: "有序列表",
      icon: ListOrdered,
      template: { before: "1. ", placeholder: "列表项", lineStart: true },
    },
    {
      label: "任务列表",
      icon: CheckSquare,
      template: { before: "- [ ] ", placeholder: "待办事项", lineStart: true },
    },
    {
      label: "链接",
      icon: Link,
      template: { before: "[", after: "](https://)", placeholder: "链接文字" },
    },
    {
      label: "行内代码",
      icon: Code2,
      template: { before: "`", after: "`", placeholder: "code" },
    },
    {
      label: "代码块",
      icon: FileCode2,
      template: {
        before: "```\n",
        after: "\n```",
        placeholder: "code",
        lineStart: true,
      },
    },
    {
      label: "表格",
      icon: Table2,
      template: {
        before: "| 列 1 | 列 2 |\n| --- | --- |\n| ",
        after: " | 内容 |",
        placeholder: "内容",
        lineStart: true,
      },
    },
    {
      label: "数学公式",
      icon: Sigma,
      template: { before: "$$", after: "$$", placeholder: "E = mc^2" },
    },
  ] satisfies ReadonlyArray<{
    label: string;
    icon: typeof Bold;
    template: InsertTemplate;
  }>;

  return (
    <div
      className={`markdown-editor ${error ? "markdown-editor--error" : ""} ${className}`.trim()}
      style={{ "--md-editor-min-height": `${minHeight}px` } as CSSProperties}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled && event.dataTransfer.types.includes("Files"))
          setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className="markdown-editor__heading">
        <label htmlFor={id}>
          {label} {required ? <span aria-hidden="true">*</span> : null}
        </label>
        <span className={dirty ? "markdown-editor__dirty" : ""}>
          {dirty ? "有未保存更改" : "已保存"}
        </span>
      </div>

      <div className="markdown-editor__shell">
        <div className="markdown-editor__topbar">
          <div
            className="markdown-editor__toolbar"
            role="toolbar"
            aria-label="Markdown 格式工具"
          >
            <button
              type="button"
              title="撤销"
              aria-label="撤销"
              disabled={disabled}
              onClick={() => document.execCommand("undo")}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              title="重做"
              aria-label="重做"
              disabled={disabled}
              onClick={() => document.execCommand("redo")}
            >
              <Redo2 size={16} />
            </button>
            <span className="markdown-editor__separator" />
            {toolbar.map(({ label: itemLabel, icon: Icon, template }) => (
              <button
                key={itemLabel}
                type="button"
                title={itemLabel}
                aria-label={itemLabel}
                disabled={disabled}
                onClick={() => applyTemplate(template)}
              >
                <Icon size={16} />
              </button>
            ))}
            <span className="markdown-editor__separator" />
            <button
              type="button"
              title="上传图片"
              aria-label="上传图片"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={16} />
            </button>
            {attachmentLibrary ? (
              <button
                type="button"
                title="从附件库选择"
                aria-label="从附件库选择"
                disabled={disabled}
                onClick={() => setPickerOpen(true)}
              >
                <Library size={16} />
              </button>
            ) : null}
          </div>

          <div
            className="markdown-editor__modes"
            role="group"
            aria-label="编辑器视图"
          >
            <button
              type="button"
              className={mode === "edit" ? "is-active" : ""}
              onClick={() => setMode("edit")}
            >
              <Pencil size={14} /> 编辑
            </button>
            <button
              type="button"
              className={mode === "split" ? "is-active" : ""}
              onClick={() => setMode("split")}
            >
              <Columns2 size={14} /> 分栏
            </button>
            <button
              type="button"
              className={mode === "preview" ? "is-active" : ""}
              onClick={() => setMode("preview")}
            >
              <Eye size={14} /> 预览
            </button>
          </div>
        </div>

        <div
          className={`markdown-editor__workspace markdown-editor__workspace--${mode}`}
        >
          {mode !== "preview" ? (
            <div className="markdown-editor__pane markdown-editor__edit-pane">
              <textarea
                ref={textareaRef}
                id={id}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                spellCheck="true"
                onChange={(event) => onChange(event.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : null}
          {mode !== "edit" ? (
            <div
              className="markdown-editor__pane markdown-editor__preview-pane"
              aria-label="Markdown 预览"
            >
              <MarkdownPreview value={value} />
            </div>
          ) : null}
        </div>

        <footer className="markdown-editor__footer">
          <span>{value.length.toLocaleString()} 字符</span>
          <span>
            {value.trim()
              ? value.trim().split(/\s+/u).length.toLocaleString()
              : 0}{" "}
            词
          </span>
          <span>支持 GFM · KaTeX · 代码高亮</span>
        </footer>
      </div>

      {error ? (
        <p id={`${id}-error`} className="markdown-editor__error">
          {error}
        </p>
      ) : null}

      {uploadTasks.length > 0 ? (
        <aside className="markdown-editor__uploads" aria-label="图片上传队列">
          <div className="markdown-editor__uploads-title">
            <span>
              <UploadCloud size={16} /> 图片上传
            </span>
            <small>{uploadTasks.length} 项</small>
          </div>
          {uploadTasks.map((task) => (
            <div key={task.id} className="markdown-editor__upload-item">
              <div className="markdown-editor__upload-row">
                <input
                  aria-label="上传文件名"
                  value={task.draftName}
                  disabled={task.status === "uploading"}
                  onChange={(event) =>
                    setTask(task.id, (current) => ({
                      ...current,
                      draftName: event.target.value,
                    }))
                  }
                />
                {task.status === "preparing" ? (
                  <button
                    type="button"
                    className="md-primary-button"
                    onClick={() => void startUpload(task)}
                  >
                    上传
                  </button>
                ) : task.status === "failed" ? (
                  <button
                    type="button"
                    className="md-secondary-button"
                    onClick={() => void startUpload(task)}
                  >
                    重试
                  </button>
                ) : (
                  <LoaderCircle
                    className="md-spin"
                    size={18}
                    aria-label="上传中"
                  />
                )}
                <button
                  type="button"
                  className="md-icon-button"
                  onClick={() => cancelTask(task.id)}
                  aria-label="取消上传"
                >
                  <X size={16} />
                </button>
              </div>
              {task.status === "uploading" ? (
                <div
                  className="markdown-editor__progress"
                  aria-label={`上传进度 ${task.progress}%`}
                >
                  <span style={{ width: `${task.progress}%` }} />
                  <small>{task.progress}%</small>
                </div>
              ) : null}
              {task.error ? <p>{task.error}</p> : null}
            </div>
          ))}
        </aside>
      ) : null}

      {dragging ? (
        <div className="markdown-editor__dropzone">
          <UploadCloud size={34} />
          <strong>松开即可上传并插入图片</strong>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        className="markdown-editor__file-input"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelection}
      />
      <div
        className="markdown-editor__sr-only"
        role="status"
        aria-live="polite"
      >
        {announcement}
      </div>

      {attachmentLibrary ? (
        <AttachmentPicker
          open={pickerOpen}
          items={attachmentLibrary.items}
          loading={attachmentLibrary.loading}
          error={attachmentLibrary.error}
          onClose={() => setPickerOpen(false)}
          onSelect={selectAttachment}
          onSearch={attachmentLibrary.onSearch}
          onRefresh={attachmentLibrary.onRefresh}
        />
      ) : null}
    </div>
  );
}
