"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import type { Supplier } from "@/types/erp";

const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "AED",
  "INR",
  "PKR",
  "NGN",
  "ZAR",
];

interface FormState {
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  website: string;
  tags: string;
  paymentTerms: string;
  currency: string;
  openingBalance: string;
  status: string;
  notes: string;
}

function fromSupplier(supplier: Supplier): FormState {
  return {
    code: supplier.code,
    name: supplier.name,
    contactName: supplier.contactName ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    city: supplier.city ?? "",
    country: supplier.country ?? "",
    taxId: supplier.taxId ?? "",
    website: supplier.website ?? "",
    tags: supplier.tags.join(", "),
    paymentTerms: String(supplier.paymentTerms),
    currency: supplier.currency,
    openingBalance: String(supplier.openingBalance),
    status: supplier.status,
    notes: supplier.notes ?? "",
  };
}

function blank(defaultCurrency: string, existingCodes: Set<string>): FormState {
  let index = 1;
  let code = `SUP-${String(index).padStart(3, "0")}`;
  while (existingCodes.has(code)) {
    index += 1;
    code = `SUP-${String(index).padStart(3, "0")}`;
  }

  return {
    code,
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    taxId: "",
    website: "",
    tags: "",
    paymentTerms: "30",
    currency: defaultCurrency,
    openingBalance: "0",
    status: "active",
    notes: "",
  };
}

interface SupplierFormProps {
  /** null opens a blank record. */
  supplier: Supplier | null;
  onClose: () => void;
}

export function SupplierForm({ supplier, onClose }: SupplierFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [state, setState] = useState<FormState>(() =>
    supplier
      ? fromSupplier(supplier)
      : blank(
          data.business?.currency ?? "USD",
          new Set(data.suppliers.map((entry) => entry.code)),
        ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const currencyOptions = [
    ...(data.business && !CURRENCY_CODES.includes(data.business.currency)
      ? [{ value: data.business.currency, label: data.business.currency }]
      : []),
    ...CURRENCY_CODES.map((code) => ({ value: code, label: code })),
  ];

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.code.trim()) nextErrors.code = "Code is required.";
    if (!state.name.trim()) nextErrors.name = "Name is required.";
    if (state.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!Number.isFinite(Number(state.paymentTerms)) || Number(state.paymentTerms) < 0) {
      nextErrors.paymentTerms = "Payment terms must be zero or more.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      code: state.code.trim(),
      name: state.name.trim(),
      contactName: state.contactName.trim() || undefined,
      email: state.email.trim() || undefined,
      phone: state.phone.trim() || undefined,
      address: state.address.trim() || undefined,
      city: state.city.trim() || undefined,
      country: state.country.trim() || undefined,
      taxId: state.taxId.trim() || undefined,
      website: state.website.trim() || undefined,
      tags: [
        ...new Set(
          state.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ],
      paymentTerms: Number(state.paymentTerms),
      currency: state.currency,
      openingBalance: Number(state.openingBalance),
      status: state.status === "archived" ? ("archived" as const) : ("active" as const),
      notes: state.notes.trim() || undefined,
    };

    if (supplier) {
      actions.updateRecord("suppliers", supplier.id, payload, {
        summary: `Updated supplier ${payload.name}`,
      });
      toast.success("Supplier updated", payload.name);
    } else {
      actions.createRecord("suppliers", payload as unknown as Supplier, {
        summary: `Created supplier ${payload.name}`,
      });
      toast.success("Supplier created", payload.name);
    }

    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={supplier ? "Edit supplier" : "New supplier"}
      description={
        supplier
          ? "Update the profile used on purchase orders and bills."
          : "Master data for the procure-to-pay cycle."
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {supplier ? "Save changes" : "Create supplier"}
          </Button>
        </div>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Input
          label="Code"
          required
          mono
          hint="Printed on documents."
          error={errors.code}
          value={state.code}
          onChange={(event) => set("code", event.target.value)}
        />
        <Input
          label="Name"
          required
          error={errors.name}
          placeholder="Registered or trading name"
          value={state.name}
          onChange={(event) => set("name", event.target.value)}
        />
        <Input
          label="Contact person"
          placeholder="Who you deal with"
          value={state.contactName}
          onChange={(event) => set("contactName", event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email}
          placeholder="name@company.com"
          value={state.email}
          onChange={(event) => set("email", event.target.value)}
        />
        <Input
          label="Phone"
          mono
          placeholder="+1 512 555 0100"
          value={state.phone}
          onChange={(event) => set("phone", event.target.value)}
        />
        <Input
          label="Tax ID"
          mono
          placeholder="VAT or registration number"
          value={state.taxId}
          onChange={(event) => set("taxId", event.target.value)}
        />
        <Input
          label="Address"
          placeholder="Street and number"
          value={state.address}
          onChange={(event) => set("address", event.target.value)}
        />
        <Input
          label="City"
          placeholder="City"
          value={state.city}
          onChange={(event) => set("city", event.target.value)}
        />
        <Input
          label="Country"
          placeholder="Country"
          value={state.country}
          onChange={(event) => set("country", event.target.value)}
        />
        <Input
          label="Website"
          placeholder="company.com"
          value={state.website}
          onChange={(event) => set("website", event.target.value)}
        />
        <Input
          label="Tags"
          hint="Comma separated, used as list filters."
          placeholder="preferred, wholesale"
          value={state.tags}
          onChange={(event) => set("tags", event.target.value)}
        />
        <Select
          label="Currency"
          options={currencyOptions}
          value={state.currency}
          onChange={(event) => set("currency", event.target.value)}
        />
        <Input
          label="Payment terms (days)"
          type="number"
          mono
          error={errors.paymentTerms}
          value={state.paymentTerms}
          onChange={(event) => set("paymentTerms", event.target.value)}
        />
        <Input
          label="Opening balance"
          type="number"
          mono
          hint="Amount already owed to them."
          value={state.openingBalance}
          onChange={(event) => set("openingBalance", event.target.value)}
        />
        <Select
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          value={state.status}
          onChange={(event) => set("status", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            rows={3}
            placeholder="Lead times, account numbers, contacts."
            value={state.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
