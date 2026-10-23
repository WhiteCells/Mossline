import {
  File,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentLibraryItem } from "./types";

export interface AttachmentPickerProps {
  open: boolean;
  title?: string;
  description?: string;
  items: readonly AttachmentLibraryItem[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSelect: (attachment: AttachmentLibraryItem) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
}

const formatBytes = (size?: number) => {
  if (size === undefined) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (item: AttachmentLibraryItem) =>
  item.mimeType?.startsWith("image/") === true ||
  /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(item.url);

export function AttachmentPicker({
  open,
  title = "从附件库插入",
  description = "选择图片会插入图片语法，其他文件会插入普通链接。",
  items,
  loading = false,
  error,
  onClose,
  onSelect,
  onSearch,
  onRefresh,
}: AttachmentPickerProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const visibleItems = useMemo(() => {
    if (onSearch || !query.trim()) return items;
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter((item) =>
      item.name.toLocaleLowerCase().includes(normalized),
    );
  }, [items, onSearch, query]);

  if (!open) return null;

  return (
    <div
      className="attachment-picker__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="attachment-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-picker-title"
      >
        <header className="attachment-picker__header">
          <div>
            <h2 id="attachment-picker-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button
            type="button"
            className="md-icon-button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="attachment-picker__filters">
          <div className="attachment-picker__search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              placeholder="搜索附件名称"
              aria-label="搜索附件名称"
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                onSearch?.(value);
              }}
            />
          </div>
          {onRefresh ? (
            <button
              type="button"
              className="md-secondary-button"
              onClick={onRefresh}
            >
              <RefreshCw size={15} /> 刷新
            </button>
          ) : null}
        </div>

        <div className="attachment-picker__body">
          {loading ? (
            <div className="attachment-picker__state">
              <LoaderCircle className="md-spin" size={24} /> 正在加载附件…
            </div>
          ) : error ? (
            <div className="attachment-picker__state attachment-picker__state--error">
              <p>{error}</p>
              {onRefresh ? (
                <button
                  type="button"
                  className="md-secondary-button"
                  onClick={onRefresh}
                >
                  重试
                </button>
              ) : null}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="attachment-picker__state">没有符合条件的附件</div>
          ) : (
            <div className="attachment-picker__grid">
              {visibleItems.map((item) => {
                const image = isImageAttachment(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="attachment-picker__item"
                    onClick={() => onSelect(item)}
                  >
                    <span className="attachment-picker__thumb">
                      {image ? (
                        <img
                          src={item.thumbnailUrl ?? item.url}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <File size={28} aria-hidden="true" />
                      )}
                    </span>
                    <span className="attachment-picker__item-meta">
                      <strong title={item.name}>
                        {image ? <ImageIcon size={14} /> : <File size={14} />}
                        {item.name}
                      </strong>
                      <small>
                        {formatBytes(item.size) || item.mimeType || "文件"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
