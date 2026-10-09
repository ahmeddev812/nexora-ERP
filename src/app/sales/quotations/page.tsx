"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Check, Clock, Pencil, Plus, Send, Trash2, X } from "lucide-react";

import { QuotationForm } from "@/components/sales/QuotationForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { formatDate, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Quotation, SalesOrder } from "@/types/erp";

type QuotationStatus = Quotation["status"];

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

const STATUS_TONE: Record<QuotationStatus, BadgeTone> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "destructive",
  expired: "warning",
  converted: "accent",
};

type Pending =
  | { kind: "status"; quotation: Quotation; next: QuotationStatus; label: string }
  | { kind: "convert"; quotation: Quotation }
  | { kind: "delete"; quotation: Quotation };

export default function QuotationsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  const customerById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );

  const rows = useMemo(() => {
    const list = [...data.quotations].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return list.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (customerFilter !== "all" && row.customerId !== customerFilter) return false;
      return true;
    });
  }, [data.quotations, statusFilter, customerFilter]);

  const totals = useMemo(() => {
    const open = data.quotations.filter(
      (row) => row.status === "draft" || row.status === "sent",
    );
    return {
      count: data.quotations.length,
      open: open.length,
      value: open.reduce((acc, row) => acc + row.total, 0),
      accepted: data.quotations.filter((row) => row.status === "accepted").length,
    };
  }, [data.quotations]);

  const convertToOrder = (quotation: Quotation) => {
    const customer = customerById.get(quotation.customerId);
    const warehouseId =
      quotation.warehouseId ??
      data.warehouses.find((warehouse) => warehouse.isDefault)?.id ??
      data.warehouses[0]?.id ??
      "";
    const number = actions.nextNumber("SO");
    const order = actions.createRecord(
      "salesOrders",
      {
        number,
        date: todayKey(),
        customerId: quotation.customerId,
        branchId: quotation.branchId,
        warehouseId,
        status: "draft",
        quotationId: quotation.id,
        lines: quotation.lines,
        subtotal: quotation.subtotal,
        discountTotal: quotation.discountTotal,
        taxTotal: quotation.taxTotal,
        total: quotation.total,
        currency: quotation.currency,
        paymentTerms: customer?.paymentTerms ?? 30,
        notes: quotation.notes,
      } as unknown as SalesOrder,
      { summary: `Created order ${number} from ${quotation.number}`, number },
    );
    actions.updateRecord(
      "quotations",
      quotation.id,
      { status: "converted", convertedToOrderId: order.id },
      { summary: `Converted quotation ${quotation.number} to ${number}` },
    );
    toast.success("Converted to order", `${quotation.number} → ${number}`);
    setPending(null);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "convert") {
      convertToOrder(pending.quotation);
      return;
    }
    if (pending.kind === "delete") {
      actions.deleteRecord("quotations", pending.quotation.id, {
        summary: `Deleted quotation ${pending.quotation.number}`,
      });
      toast.success("Quotation deleted", pending.quotation.number);
      setPending(null);
      return;
    }
    const { quotation, next, label } = pending;
    actions.updateRecord(
      "quotations",
      quotation.id,
      { status: next },
      { summary: `${label} quotation ${quotation.number}` },
    );
    toast.success(`Quotation ${label.toLowerCase()}`, quotation.number);
    setPending(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const renderActions = (row: Quotation) => {
    const buttons: React.ReactNode[] = [];
    if (row.status === "draft") {
      buttons.push(
        <button
          key="edit"
          type="button"
          aria-label={`Edit ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setEditing(row);
            setFormOpen(true);
          }}
          className={`${iconClass} hover:border-line-strong hover:text-ink`}
        >
          <Pencil size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="send"
          type="button"
          aria-label={`Send ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "status", quotation: row, next: "sent", label: "Sent" });
          }}
          className={`${iconClass} hover:border-primary hover:text-primary`}
        >
          <Send size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="delete"
          type="button"
          aria-label={`Delete ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "delete", quotation: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "sent") {
      buttons.push(
        <button
          key="accept"
          type="button"
          aria-label={`Accept ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "status", quotation: row, next: "accepted", label: "Accepted" });
          }}
          className={`${iconClass} hover:border-success hover:text-success`}
        >
          <Check size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="reject"
          type="button"
          aria-label={`Reject ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "status", quotation: row, next: "rejected", label: "Rejected" });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <X size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="expire"
          type="button"
          aria-label={`Expire ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "status", quotation: row, next: "expired", label: "Expired" });
          }}
          className={`${iconClass} hover:border-warning hover:text-warning`}
        >
          <Clock size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "accepted") {
      buttons.push(
        <button
          key="convert"
          type="button"
          aria-label={`Convert ${row.number} to order`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "convert", quotation: row });
          }}
          className={`${iconClass} hover:border-accent hover:text-accent-strong`}
        >
          <ArrowRightLeft size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    return <span className="flex items-center justify-end gap-1.5">{buttons}</span>;
  };

  const columns: Array<DataTableColumn<Quotation>> = [
    {
      key: "number",
      header: "Quotation",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "customer",
      header: "Customer",
      value: (row) => customerById.get(row.customerId)?.name ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {customerById.get(row.customerId)?.name ?? "Unknown customer"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {customerById.get(row.customerId)?.code ?? ""}
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      value: (row) => row.date,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "validUntil",
      header: "Valid until",
      value: (row) => row.validUntil,
      render: (row) => {
        const expired = row.validUntil < todayKey() && row.status === "sent";
        return (
          <span className={expired ? "numeric text-[13px] text-warning" : "numeric text-[13px] text-ink-muted"}>
            {formatDate(row.validUntil, "us")}
          </span>
        );
      },
      hideBelow: "md",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (row) => row.total,
      render: (row) => <span className="numeric text-[13px] text-ink">{formatMoney(row.total, row.currency, 2)}</span>,
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: renderActions,
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[140px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          ...(Object.keys(STATUS_LABEL) as QuotationStatus[]).map((status) => ({
            value: status,
            label: STATUS_LABEL[status],
          })),
        ]}
      />
      <Select
        aria-label="Filter by customer"
        className="w-auto min-w-[160px]"
        value={customerFilter}
        onChange={(event) => setCustomerFilter(event.target.value)}
        options={[
          { value: "all", label: "All customers" },
          ...data.customers.map((customer) => ({
            value: customer.id,
            label: customer.name,
          })),
        ]}
      />
    </div>
  );

  const pendingCopy = () => {
    if (!pending) return { title: "", message: "", label: "" };
    if (pending.kind === "delete") {
      return {
        title: "Delete quotation?",
        message: `${pending.quotation.number} will be removed. This cannot be undone.`,
        label: "Delete",
      };
    }
    if (pending.kind === "convert") {
      return {
        title: "Convert to order?",
        message: `${pending.quotation.number} becomes a draft sales order with the same captured prices.`,
        label: "Convert",
      };
    }
    return {
      title: `${pending.label} quotation?`,
      message: `${pending.quotation.number} moves to ${STATUS_LABEL[pending.next].toLowerCase()}.`,
      label: pending.label,
    };
  };

  const copy = pendingCopy();

  return (
    <AppShell>
      <PageHeader
        title="Quotations"
        description="Proposals to customers, with send, accept, reject and expiry handled in place."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New quotation
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Quotations", value: String(totals.count), hint: `${totals.open} still open` },
          { label: "Open value", value: formatMoney(totals.value, "", 0), hint: "Draft and sent" },
          { label: "Accepted", value: String(totals.accepted), tone: "success", hint: "Ready to convert" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, customer or notes"
        searchValue={(row) =>
          `${row.number} ${customerById.get(row.customerId)?.name ?? ""} ${row.notes ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No quotations yet"
        emptyDescription="Create a quotation, send it, then accept or reject it here."
        pageSize={12}
        exportName="quotations"
        caption="Sales quotations"
      />

      {formOpen ? <QuotationForm quotation={editing} onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pending !== null}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.label}
        destructive={pending?.kind === "delete"}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
