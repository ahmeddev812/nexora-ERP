"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Send, Trash2, X } from "lucide-react";

import { PurchaseOrderForm } from "@/components/purchasing/PurchaseOrderForm";
import { RequestForm } from "@/components/purchasing/RequestForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { PurchaseRequest } from "@/types/erp";

type RequestStatus = PurchaseRequest["status"];
type Priority = PurchaseRequest["priority"];

const STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  converted: "Converted",
};

const STATUS_TONE: Record<RequestStatus, BadgeTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "info",
  rejected: "destructive",
  converted: "success",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

type Pending =
  | { kind: "submit" | "approve" | "reject"; request: PurchaseRequest }
  | { kind: "delete"; request: PurchaseRequest };

export default function PurchaseRequestsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRequest | null>(null);
  const [converting, setConverting] = useState<PurchaseRequest | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );
  const departmentById = useMemo(
    () => new Map(data.departments.map((department) => [department.id, department.name])),
    [data.departments],
  );
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of data.auditLog) {
      if (!map.has(entry.actorId)) map.set(entry.actorId, entry.actorName);
    }
    if (user?.id && !map.has(user.id)) map.set(user.id, user.name);
    return map;
  }, [data.auditLog, user]);

  const rows = useMemo(() => {
    const list = [...data.purchaseRequests].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return list.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (priorityFilter !== "all" && row.priority !== priorityFilter) return false;
      return true;
    });
  }, [data.purchaseRequests, statusFilter, priorityFilter]);

  const metrics = useMemo(
    () => ({
      count: data.purchaseRequests.length,
      pending: data.purchaseRequests.filter((row) => row.status === "pending").length,
      approved: data.purchaseRequests.filter((row) => row.status === "approved").length,
      openValue: data.purchaseRequests
        .filter((row) => row.status === "pending" || row.status === "approved")
        .reduce((acc, row) => acc + row.total, 0),
    }),
    [data.purchaseRequests],
  );

  const confirm = () => {
    if (!pending) return;
    const { request } = pending;

    if (pending.kind === "delete") {
      actions.deleteRecord("purchaseRequests", request.id, {
        summary: `Deleted request ${request.number}`,
      });
      toast.success("Request deleted", request.number);
      setPending(null);
      return;
    }

    if (pending.kind === "submit") {
      actions.updateRecord(
        "purchaseRequests",
        request.id,
        { status: "pending" },
        { summary: `Submitted request ${request.number} for approval` },
      );
      toast.success("Sent for approval", request.number);
      setPending(null);
      return;
    }

    if (pending.kind === "approve") {
      actions.updateRecord(
        "purchaseRequests",
        request.id,
        { status: "approved", decidedBy: user?.id, decidedAt: new Date().toISOString() },
        { summary: `Approved request ${request.number}` },
      );
      toast.success("Request approved", `${request.number} can be converted into a purchase order`);
      setPending(null);
      return;
    }

    actions.updateRecord(
      "purchaseRequests",
      request.id,
      { status: "rejected", decidedBy: user?.id, decidedAt: new Date().toISOString() },
      { summary: `Rejected request ${request.number}` },
    );
    toast.info("Request rejected", request.number);
    setPending(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const renderActions = (row: PurchaseRequest) => {
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
          key="submit"
          type="button"
          aria-label={`Submit ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "submit", request: row });
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
            setPending({ kind: "delete", request: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "pending") {
      buttons.push(
        <button
          key="approve"
          type="button"
          aria-label={`Approve ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "approve", request: row });
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
            setPending({ kind: "reject", request: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <X size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "approved") {
      buttons.push(
        <button
          key="convert"
          type="button"
          aria-label={`Convert ${row.number} to a purchase order`}
          onClick={(event) => {
            event.stopPropagation();
            setConverting(row);
          }}
          className={`${iconClass} hover:border-primary hover:text-primary`}
        >
          <Send size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    return <span className="flex items-center justify-end gap-1.5">{buttons}</span>;
  };

  const columns: Array<DataTableColumn<PurchaseRequest>> = [
    {
      key: "number",
      header: "Request",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "requestedBy",
      header: "Requested by",
      value: (row) => nameById.get(row.requestedBy) ?? row.requestedBy,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {nameById.get(row.requestedBy) ?? "Team member"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {departmentById.get(row.departmentId ?? "") ?? warehouseById.get(row.warehouseId) ?? ""}
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
      key: "lines",
      header: "Lines",
      align: "right",
      value: (row) => row.lines.length,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{row.lines.length}</span>,
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "total",
      header: "Estimate",
      align: "right",
      value: (row) => row.total,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.total, data.business?.currency ?? "USD", 2)}
        </span>
      ),
      mono: true,
    },
    {
      key: "priority",
      header: "Priority",
      value: (row) => row.priority,
      render: (row) => (
        <Badge tone={row.priority === "high" ? "warning" : row.priority === "low" ? "neutral" : "info"}>
          {PRIORITY_LABEL[row.priority]}
        </Badge>
      ),
      hideBelow: "lg",
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={STATUS_TONE[row.status]} dot>{STATUS_LABEL[row.status]}</Badge>,
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
        className="w-auto min-w-[160px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          ...(Object.keys(STATUS_LABEL) as RequestStatus[]).map((status) => ({
            value: status,
            label: STATUS_LABEL[status],
          })),
        ]}
      />
      <Select
        aria-label="Filter by priority"
        className="w-auto min-w-[140px]"
        value={priorityFilter}
        onChange={(event) => setPriorityFilter(event.target.value)}
        options={[
          { value: "all", label: "All priorities" },
          { value: "high", label: "High" },
          { value: "normal", label: "Normal" },
          { value: "low", label: "Low" },
        ]}
      />
    </div>
  );

  const copy = (() => {
    if (!pending) return { title: "", message: "", label: "", destructive: false };
    const { request, kind } = pending;
    if (kind === "delete") {
      return {
        title: "Delete request?",
        message: `${request.number} will be removed. This cannot be undone.`,
        label: "Delete",
        destructive: true,
      };
    }
    if (kind === "submit") {
      return {
        title: "Submit for approval?",
        message: `${request.number} moves to the approval queue.`,
        label: "Submit",
        destructive: false,
      };
    }
    if (kind === "approve") {
      return {
        title: "Approve request?",
        message: `${request.number} can be converted into a purchase order.`,
        label: "Approve",
        destructive: false,
      };
    }
    return {
      title: "Reject request?",
      message: `${request.number} moves to rejected and nothing is ordered.`,
      label: "Reject",
      destructive: true,
    };
  })();

  return (
    <AppShell>
      <PageHeader
        title="Purchase requests"
        description="Raise demand for stock, approve it, then convert it into a purchase order."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New request
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Requests", value: String(metrics.count), hint: "All time" },
          {
            label: "Awaiting approval",
            value: String(metrics.pending),
            tone: metrics.pending > 0 ? "accent" : "default",
            hint: "Pending review",
          },
          { label: "Approved", value: String(metrics.approved), tone: "success", hint: "Ready to order" },
          { label: "Open value", value: formatMoney(metrics.openValue, "", 0), hint: "Pending and approved" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, requester or reason"
        searchValue={(row) =>
          `${row.number} ${nameById.get(row.requestedBy) ?? ""} ${row.reason ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No purchase requests yet"
        emptyDescription="Raise a request, submit it for approval, then convert it into an order."
        pageSize={12}
        exportName="purchase-requests"
        caption="Purchase requests"
      />

      {formOpen ? <RequestForm request={editing} onClose={() => setFormOpen(false)} /> : null}
      {converting ? (
        <PurchaseOrderForm order={null} request={converting} onClose={() => setConverting(null)} />
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.label}
        destructive={copy.destructive}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
