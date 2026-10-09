import { Check, Info, TriangleAlert, X, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ToastItem, ToastVariant } from "@/context/ToastContext";

const TONES: Record<ToastVariant, string> = {
  success: "border-success/30 text-success",
  error: "border-destructive/30 text-destructive",
  warning: "border-warning/35 text-warning",
  info: "border-info/30 text-info",
};

const ICONS: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

interface ToastViewportProps {
  toasts: readonly ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            className={cn(
              "glass modal-shadow slide-in pointer-events-auto w-full rounded-card border p-3.5",
              TONES[toast.variant],
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{toast.title}</p>
                {toast.message ? (
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                    {toast.message}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="focus-ring-visible -mr-1 -mt-1 rounded-tag p-1 text-ink-faint transition-colors hover:text-ink"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
