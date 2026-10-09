"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { ERPDataProvider } from "@/context/ERPDataProvider";
import { ToastProvider } from "@/context/ToastContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ToastProvider>
        <AuthProvider>
          <ERPDataProvider>{children}</ERPDataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
