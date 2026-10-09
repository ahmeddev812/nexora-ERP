"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { effectiveInvoiceStatus, invoiceBalance, round2 } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Payment, PaymentAllocation, SalesInvoice } from "@/types/erp";

interface RecordPaymentModalProps {
  invoice: SalesInvoice;
  onClose: () => void;
}

export function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const balance = useMemo(() => invoiceBalance(invoice), [invoice]);
  const customer = data.customers.find((entry) => entry.id === invoice.customerId);

  const [amount, setAmount] = useState(String(balance));
  const [date, setDate] = useState(todayKey());
  const [method, setMethod] = useState<Payment["method"]>("bank_transfer");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    const value = round2(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount above zero.");
      return;
    }
    if (value > balance) {
      setError(`At most ${formatMoney(balance, invoice.currency, 2)} is still outstanding.`);
      return;
    }

    const number = actions.nextNumber("PAY");
    const payment = actions.createRecord(
      "payments",
      {
        number,
        date,
        direction: "inbound",
        method,
        partyType: "customer",
        partyId: invoice.customerId,
        partyName: customer?.name ?? "Customer",
        amount: value,
        currency: invoice.currency,
        bankAccountId: data.accounts.find((account) => account.code === "1010")?.id ?? null,
        reference: reference.trim() || undefined,
        status: "cleared",
      } as unknown as Payment,
      { summary: `Received ${formatMoney(value, invoice.currency, 2)} from ${customer?.name ?? "customer"}`, number },
    );

    actions.createRecord(
      "paymentAllocations",
      {
        paymentId: payment.id,
        targetType: "sales_invoice",
        targetId: invoice.id,
        targetNumber: invoice.number,
        amount: value,
      } as unknown as PaymentAllocation,
      { summary: `Allocated ${formatMoney(value, invoice.currency, 2)} to ${invoice.number}` },
    );

    const paidAmount = round2(invoice.paidAmount + value);
    const status = effectiveInvoiceStatus({ ...invoice, paidAmount });
    actions.updateRecord(
      "salesInvoices",
      invoice.id,
      { paidAmount, status },
      { summary: `Received ${formatMoney(value, invoice.currency, 2)} against ${invoice.number}` },
    );

    const cash = data.accounts.find((account) => account.code === "1010");
    const receivable = data.accounts.find((account) => account.code === "1100");
    if (cash && receivable) {
      actions.postJournal({
        date,
        memo: `Receipt ${number} from ${customer?.name ?? "customer"}`,
        refType: "payment",
        refId: payment.id,
        refNumber: number,
        lines: [
          { accountId: cash.id, debit: value, credit: 0 },
          { accountId: receivable.id, debit: 0, credit: value },
        ],
      });
    } else {
      toast.warning(
        "No receipt entry posted",
        "The chart of accounts is missing account 1010 or 1100.",
      );
    }

    toast.success("Payment recorded", `${invoice.number} · ${formatMoney(value, invoice.currency, 2)}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Receive payment · ${invoice.number}`}
      description={`Outstanding ${formatMoney(balance, invoice.currency, 2)}. Partial receipts keep the rest as receivable.`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Record payment
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount"
          type="number"
          mono
          required
          error={error}
          hint={`Maximum ${formatMoney(balance, invoice.currency, 2)}`}
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
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
        <Input
          label="Reference"
          mono
          placeholder="Bank reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </div>
    </Modal>
  );
}
