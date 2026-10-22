import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "./Button";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 aria-hidden="true" />,
  error: <XCircle aria-hidden="true" />,
  warning: <AlertCircle aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
};

let toastSequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      toastSequence += 1;
      const id = toastSequence;
      setToasts((items) => [
        ...items,
        { ...input, tone: input.tone ?? "info", id },
      ]);
      const duration = input.duration ?? 4500;
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-region" aria-live="polite" aria-label="操作通知">
        {toasts.map((item) => {
          const tone = item.tone ?? "info";
          return (
            <div
              className={`ui-toast ui-toast--${tone}`}
              key={item.id}
              role={tone === "error" ? "alert" : "status"}
            >
              <span className="ui-toast__icon">{icons[tone]}</span>
              <div className="ui-toast__copy">
                <strong>{item.title}</strong>
                {item.description && <p>{item.description}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭通知"
                onClick={() => dismiss(item.id)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast 必须在 ToastProvider 内使用");
  return context;
}
