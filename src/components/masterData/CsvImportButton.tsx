"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { useToastContext } from "@/context/ToastContext";
import { parseCSV } from "@/lib/export";
import { Button } from "@/components/ui/Button";

interface CsvImportButtonProps {
  /** Reads the parsed data rows. Return the number imported for the success toast. */
  onImport: (rows: Array<Record<string, string>>) => number | Promise<number>;
  label?: string;
  disabled?: boolean;
}

export function CsvImportButton({
  onImport,
  label = "Import CSV",
  disabled = false,
}: CsvImportButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToastContext();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("Nothing to import", "The file has a header but no data rows.");
        return;
      }
      const count = await onImport(rows);
      toast.success(
        count > 0 ? `Imported ${count} record${count === 1 ? "" : "s"}` : "Nothing imported",
        count > 0 ? `${rows.length} row${rows.length === 1 ? "" : "s"} read from ${file.name}.` : undefined,
      );
    } catch (error) {
      toast.error(
        "Import failed",
        error instanceof Error ? error.message : "The file could not be read.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        disabled={disabled}
        iconLeft={<Upload size={14} strokeWidth={1.5} />}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}
