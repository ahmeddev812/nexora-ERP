"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import {
  effectiveInvoiceStatus,
  invoiceBalance,
  isActiveBill,
  isActiveSale,
  round2,
} from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Payment, PaymentAllocation, SalesInvoice, SupplierBill } from "@/types/erp";

type Direction = Payment["direction"];

interface PaymentFormProps {
  onClose: () => void;
}

export function PaymentForm({ onClose }: PaymentFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [direction, setDirection] = useState<Direction>("inbound");
  const [partyId, setPartyId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("bank_transfer");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isInbound = direction === "inbound";

  const parties = isInbound ? data.customers : data.suppliers;

  const openInvoices = useMemo(
    () =>
      data.salesInvoices.filter(
        (invoice) =>
          isActiveSale(invoice) &&
          invoiceBalance(invoice) > 0 &&
          effectiveInvoiceStatus(invoice) !== "void",
      ),
    [data.salesInvoices],
  );
  const openBills = useMemo(
    () => data.supplierBills.filter((bill) => isActiveBill(bill) && invoiceBalance(bill) > 0),
    [data.supplierBills],
  );

  const openTargets = isInbound ? openInvoices : openBills;
  const visibleTargets: Array<SalesInvoice | SupplierBill> = !partyId
    ? openTargets
    : isInbound
      ? openInvoices.filter((invoice) => invoice.customerId === partyId)
      : openBills.filter((bill) => bill.supplierId === partyId);

  const selectedTarget = visibleTargets.find((doc) => doc.id === targetId);
  const targetBalance = selectedTarget ? invoiceBalance(selectedTarget) : 0;

  const switchDirection = (next: Direction) => {
    setDirection(next);
    setPartyId("");
    setTargetId("");
    setAmount("");
    setErrors({});
  };

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!partyId) nextErrors.party = isInbound ? "Customer is required." : "Supplier is required.";
    const value = round2(Number(amount));
    if (!Number.isFinite(value) || value <= 0) nextErrors.amount = "Enter an amount above zero.";
    if (selectedTarget && value > targetBalance) {
      nextErrors.amount = `At most ${formatMoney(targetBalance, "", 2)} is still outstanding.`;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const party = parties.find((entry) => entry.id === partyId);
    const number = actions.nextNumber("PAY");
    const currency = data.business?.currency ?? "USD";
    const bankAccountId = data.accounts.find((account) => account.code === "1010")?.id ?? null;

    const payment = actions.createRecord(
      "payments",
      {
        number,
        date,
        direction,
        method,
        partyType: isInbound ? "customer" : "supplier",
        partyId,
        partyName: party?.name ?? (isInbound ? "Customer" : "Supplier"),
        amount: value,
        currency,
        bankAccountId,
        reference: reference.trim() || undefined,
        status: "cleared",
      } as unknown as Payment,
      {
        summary: isInbound
          ? `Received ${formatMoney(value, currency, 2)} from ${party?.name ?? "customer"}`
          : `Paid ${formatMoney(value, currency, 2)} to ${party?.name ?? "supplier"}`,
        number,
      },
    );

    if (selectedTarget) {
      actions.createRecord(
        "paymentAllocations",
        {
          paymentId: payment.id,
          targetType: isInbound ? "sales_invoice" : "supplier_bill",
          targetId: selectedTarget.id,
          targetNumber: selectedTarget.number,
          amount: value,
        } as unknown as PaymentAllocation,
        { summary: `Allocated ${formatMoney(value, currency, 2)} to ${selectedTarget.number}` },
      );

      const paidAmount = round2(selectedTarget.paidAmount + value);
      if (isInbound) {
        const invoice = selectedTarget as SalesInvoice;
        actions.updateRecord(
          "salesInvoices",
          invoice.id,
          { paidAmount, status: effectiveInvoiceStatus({ ...invoice, paidAmount }) },
          { summary: `Received ${formatMoney(value, currency, 2)} against ${invoice.number}` },
        );
      } else {
        const bill = selectedTarget as SupplierBill;
        actions.updateRecord(
          "supplierBills",
          bill.id,
          { paidAmount, status: effectiveInvoiceStatus({ ...bill, paidAmount }) },
          { summary: `Paid ${formatMoney(value, currency, 2)} against ${bill.number}` },
        );
      }
    }

    const cash = data.accounts.find((account) => account.code === "1010");
    const receivable = data.accounts.find((account) => account.code === "1100");
    const payable = data.accounts.find((account) => account.code === "2000");
    const counterparty = isInbound ? receivable : payable;

    if (cash && counterparty) {
      actions.postJournal({
        date,
        memo: isInbound
          ? `Receipt ${number} from ${party?.name ?? "customer"}`
          : `Payment ${number} to ${party?.name ?? "supplier"}`,
        refType: "payment",
        refId: payment.id,
        refNumber: number,
        lines: isInbound
          ? [
              { accountId: cash.id, debit: value, credit: 0 },
              { accountId: counterparty.id, debit: 0, credit: value },
            ]
          : [
              { accountId: counterparty.id, debit: value, credit: 0 },
              { accountId: cash.id, debit: 0, credit: value },
            ],
      });
    } else {
      toast.warning(
        "No payment entry posted",
        "The chart of accounts is missing account 1010, 1100 or 2000.",
      );
    }

    toast.success(
      isInbound ? "Receipt recorded" : "Payment recorded",
      selectedTarget
        ? `${selectedTarget.number} · ${formatMoney(value, currency, 2)}`
        : formatMoney(value, currency, 2),
    );
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New payment"
      description="Receipts come in from customers, payments go out to suppliers. Both post to cash."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {isInbound ? "Record receipt" : "Record payment"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Direction"
          options={[
            { value: "inbound", label: "Receipt from customer" },
            { value: "outbound", label: "Payment to supplier" },
          ]}
          value={direction}
          onChange={(event) => switchDirection(event.target.value as Direction)}
        />
        <Select
          label={isInbound ? "Customer" : "Supplier"}
          required
          error={errors.party}
          options={[
            { value: "", label: "Select a party" },
            ...parties.map((entry) => ({ value: entry.id, label: entry.name })),
          ]}
          value={partyId}
          onChange={(event) => {
            setPartyId(event.target.value);
            setTargetId("");
            setErrors((current) => ({ ...current, party: "" }));
          }}
        />
        <Select
          label={isInbound ? "Apply to invoice" : "Apply to bill"}
          options={[
            { value: "", label: "No allocation (on account)" },
            ...visibleTargets.map((doc) => ({
              value: doc.id,
              label: `${doc.number} · ${formatMoney(invoiceBalance(doc), "", 2)} open`,
            })),
          ]}
          value={targetId}
          onChange={(event) => {
            setTargetId(event.target.value);
            const doc = visibleTargets.find((entry) => entry.id === event.target.value);
            if (doc) setAmount(String(invoiceBalance(doc)));
            setErrors((current) => ({ ...current, amount: "" }));
          }}
        />
        <Input
          label="Amount"
          type="number"
          mono
          required
          error={errors.amount}
          hint={
            selectedTarget
              ? `Outstanding ${formatMoney(targetBalance, "", 2)}`
              : "Applied on account when no document is picked"
          }
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setErrors((current) => ({ ...current, amount: "" }));
          }}
        />
        <Input
          label="Date"
          type="date"
          mono
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Select
          label="Method"
          options={[
            { value: "bank_transfer", label: "Bank transfer" },
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card" },
            { value: "cheque", label: "Cheque" },
            { value: "other", label: "Other" },
          ]}
          value={method}
          onChange={(event) => setMethod(event.target.value as Payment["method"])}
        />
        <div className="sm:col-span-2">
          <Input
            label="Reference"
            mono
            placeholder="Bank reference or cheque number"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
