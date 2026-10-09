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
import type { Payment, PaymentAllocation, SupplierBill } from "@/types/erp";

interface PaySupplierModalProps {
  bill: SupplierBill;
  onClose: () => void;
}

export function PaySupplierModal({ bill, onClose }: PaySupplierModalProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const balance = useMemo(() => invoiceBalance(bill), [bill]);
  const supplier = data.suppliers.find((entry) => entry.id === bill.supplierId);

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
      setError(`At most ${formatMoney(balance, bill.currency, 2)} is still outstanding.`);
      return;
    }

    const number = actions.nextNumber("PAY");
    const payment = actions.createRecord(
      "payments",
      {
        number,
        date,
        direction: "outbound",
        method,
        partyType: "supplier",
        partyId: bill.supplierId,
        partyName: supplier?.name ?? "Supplier",
        amount: value,
        currency: bill.currency,
        bankAccountId: data.accounts.find((account) => account.code === "1010")?.id ?? null,
        reference: reference.trim() || undefined,
        status: "cleared",
      } as unknown as Payment,
      {
        summary: `Paid ${formatMoney(value, bill.currency, 2)} to ${supplier?.name ?? "supplier"}`,
        number,
      },
    );

    actions.createRecord(
      "paymentAllocations",
      {
        paymentId: payment.id,
        targetType: "supplier_bill",
        targetId: bill.id,
        targetNumber: bill.number,
        amount: value,
      } as unknown as PaymentAllocation,
      { summary: `Allocated ${formatMoney(value, bill.currency, 2)} to ${bill.number}` },
    );

    const paidAmount = round2(bill.paidAmount + value);
    const status = effectiveInvoiceStatus({ ...bill, paidAmount });
    actions.updateRecord(
      "supplierBills",
      bill.id,
      { paidAmount, status },
      { summary: `Paid ${formatMoney(value, bill.currency, 2)} against ${bill.number}` },
    );

    const cash = data.accounts.find((account) => account.code === "1010");
    const payable = data.accounts.find((account) => account.code === "2000");
    if (cash && payable) {
      actions.postJournal({
        date,
        memo: `Payment ${number} to ${supplier?.name ?? "supplier"}`,
        refType: "payment",
        refId: payment.id,
        refNumber: number,
        lines: [
          { accountId: payable.id, debit: value, credit: 0 },
          { accountId: cash.id, debit: 0, credit: value },
        ],
      });
    } else {
      toast.warning(
        "No payment entry posted",
        "The chart of accounts is missing account 1010 or 2000.",
      );
    }

    toast.success(
      "Payment recorded",
      `${bill.number} · ${formatMoney(value, bill.currency, 2)}`,
    );
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pay bill ${bill.number}`}
      description={`Outstanding ${formatMoney(balance, bill.currency, 2)}. Partial payments keep the rest as payables.`}
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
          hint={`Maximum ${formatMoney(balance, bill.currency, 2)}`}
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
