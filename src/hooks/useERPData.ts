"use client";

import {
  useActionsContext,
  useDataContext,
  type DataContextValue,
  type ERPActions,
} from "@/context/ERPDataProvider";

export function useERPData(): DataContextValue {
  return useDataContext();
}

export function useERPActions(): ERPActions {
  return useActionsContext();
}
