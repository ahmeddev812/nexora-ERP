"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { generateId } from "@/lib/id";
import { ToastViewport } from "@/components/ui/Toast";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  createdAt: number;
}

export interface ToastInput {
  title: string;
  message?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: readonly ToastItem[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4500;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput): string => {
      const id = generateId("tst");
      const item: ToastItem = {
        id,
        title: input.title,
        message: input.message,
        variant: input.variant ?? "info",
        createdAt: Date.now(),
      };

      setToasts((current) => [...current, item].slice(-MAX_VISIBLE));

      const duration = input.duration ?? DEFAULT_DURATION;
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, duration);
      timers.current.set(id, timer);

      return id;
    },
    [],
  );

  const success = useCallback(
    (title: string, message?: string) => push({ title, message, variant: "success" }),
    [push],
  );
  const error = useCallback(
    (title: string, message?: string) => push({ title, message, variant: "error" }),
    [push],
  );
  const info = useCallback(
    (title: string, message?: string) => push({ title, message, variant: "info" }),
    [push],
  );
  const warning = useCallback(
    (title: string, message?: string) => push({ title, message, variant: "warning" }),
    [push],
  );

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss, clear, success, error, info, warning }),
    [toasts, push, dismiss, clear, success, error, info, warning],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used inside <ToastProvider>");
  }
  return context;
}
