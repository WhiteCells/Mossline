import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  impact?: ReactNode;
}

/** 展示操作确认，等待状态、错误提示和成功后的关闭均由调用方控制 */
export function ConfirmDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "确认",
  cancelLabel = "取消",
  loading = false,
  danger = true,
  impact,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    try {
      void Promise.resolve(onConfirm()).catch(() => undefined);
    } catch {
      // 操作错误和等待状态由调用方处理，避免重复提示
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      size="sm"
      closeOnBackdrop={!loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="ui-confirm">
        <span
          className={`ui-confirm__icon ${danger ? "ui-confirm__icon--danger" : ""}`}
        >
          <AlertTriangle aria-hidden="true" />
        </span>
        <div>
          <div className="ui-confirm__description">{description}</div>
          {impact && <div className="ui-confirm__impact">{impact}</div>}
        </div>
      </div>
    </Modal>
  );
}
