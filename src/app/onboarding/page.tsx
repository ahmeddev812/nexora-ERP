"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/brand/Logo";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/useAuth";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { useToastContext } from "@/context/ToastContext";
import { generateId } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { BusinessProfile, Industry, PrimaryMetric, Role } from "@/types/erp";

const STEPS = [
  { key: "company", label: "Company", note: "Who you are and where you sell" },
  { key: "money", label: "Money", note: "Currency, tax and terms" },
  { key: "structure", label: "Structure", note: "First site and first stock room" },
  { key: "team", label: "Team", note: "Add people now or later" },
];

const INDUSTRIES: Industry[] = [
  "retail",
  "distribution",
  "manufacturing",
  "services",
  "hospitality",
  "healthcare",
  "technology",
  "other",
];

const METRICS: Array<{ value: PrimaryMetric; label: string }> = [
  { value: "revenue", label: "Revenue" },
  { value: "profit", label: "Profit" },
  { value: "cash", label: "Cash in hand" },
  { value: "stock", label: "Stock value" },
  { value: "orders", label: "Orders" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "AED", "ZAR", "NGN", "BRL"];

const TERMS = ["0", "15", "30", "45", "60"];

const TEAM_ROLES: Role[] = ["admin", "manager", "cashier", "accountant", "viewer"];

function OnboardingFlow() {
  const router = useRouter();
  const { user, createUser } = useAuth();
  const { business, branches, warehouses, settings } = useERPData();
  const { setSingleton, createRecord } = useERPActions();
  const toast = useToastContext();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState<Industry>("distribution");
  const [country, setCountry] = useState("USA");

  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("8.25");
  const [terms, setTerms] = useState("30");
  const [metric, setMetric] = useState<PrimaryMetric>("revenue");
  const [revenueTarget, setRevenueTarget] = useState("");

  const [branchName, setBranchName] = useState("Main Branch");
  const [warehouseName, setWarehouseName] = useState("Main Warehouse");
  const [city, setCity] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("manager");

  const progress = ((step + 1) / STEPS.length) * 100;

  const validate = (): string | null => {
    if (step === 0 && companyName.trim().length < 2) {
      return "Enter the name of your business.";
    }
    if (step === 1) {
      const rate = Number(taxRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return "Tax rate must be between 0 and 100.";
      }
    }
    if (step === 2) {
      if (branchName.trim().length < 2) return "Give the first branch a name.";
      if (warehouseName.trim().length < 2) return "Give the first warehouse a name.";
    }
    return null;
  };

  const persistProfile = () => {
    const now = new Date().toISOString();
    const profile: BusinessProfile = {
      id: business?.id ?? generateId("biz"),
      name: companyName.trim(),
      legalName: companyName.trim(),
      industry,
      currency,
      timezone:
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC",
      fiscalYearStart: business?.fiscalYearStart ?? `${new Date().getFullYear()}-01-01`,
      defaultTaxRate: Number(taxRate),
      country: country.trim() || undefined,
      primaryMetric: metric,
      revenueTarget: Number(revenueTarget) || 0,
      expenseTarget: business?.expenseTarget ?? 0,
      onboardingDone: false,
      createdAt: business?.createdAt ?? now,
      updatedAt: now,
    };
    setSingleton("business", profile, { summary: "Configured business profile" });
  };

  const persistSettings = (branchId: string | null, warehouseId: string | null) => {
    setSingleton(
      "settings",
      {
        id: settings?.id ?? generateId("set"),
        theme: settings?.theme ?? "system",
        currencyDecimals: settings?.currencyDecimals ?? 2,
        dateFormat: settings?.dateFormat ?? "iso",
        defaultBranchId: branchId,
        defaultWarehouseId: warehouseId,
        defaultPaymentTerms: Number(terms),
        lowStockThreshold: settings?.lowStockThreshold ?? 10,
        reduceMotion: settings?.reduceMotion ?? false,
        updatedAt: new Date().toISOString(),
      },
      { summary: "Applied onboarding defaults" },
    );
  };

  const finish = () => {
    const now = new Date().toISOString();

    let branchId = branches[0]?.id ?? null;
    let warehouseId = warehouses[0]?.id ?? null;

    if (!branchId) {
      const branch = createRecord(
        "branches",
        {
          id: generateId("brn"),
          code: "MAIN",
          name: branchName.trim(),
          city: city.trim() || undefined,
          status: "active",
          createdAt: now,
        },
        { summary: `Created branch ${branchName.trim()}` },
      );
      branchId = branch.id;
    }

    if (!warehouseId) {
      const warehouse = createRecord(
        "warehouses",
        {
          id: generateId("whs"),
          code: "WH1",
          name: warehouseName.trim(),
          branchId,
          isDefault: true,
          status: "active",
          createdAt: now,
        },
        { summary: `Created warehouse ${warehouseName.trim()}` },
      );
      warehouseId = warehouse.id;
    }

    persistSettings(branchId, warehouseId);

    if (memberName.trim().length >= 2 && memberEmail.trim().length > 0) {
      const created = createUser({
        name: memberName.trim(),
        email: memberEmail.trim(),
        password: "changeme123",
        role: memberRole,
      });
      if (!created.ok) {
        toast.warning("Teammate not added", created.error);
      } else {
        toast.success("Teammate added", "They can change their password after signing in.");
      }
    }

    const profile: BusinessProfile = {
      id: business?.id ?? generateId("biz"),
      name: companyName.trim(),
      legalName: companyName.trim(),
      industry,
      currency,
      timezone:
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC",
      fiscalYearStart: business?.fiscalYearStart ?? `${new Date().getFullYear()}-01-01`,
      defaultTaxRate: Number(taxRate),
      country: country.trim() || undefined,
      primaryMetric: metric,
      revenueTarget: Number(revenueTarget) || 0,
      expenseTarget: business?.expenseTarget ?? 0,
      onboardingDone: true,
      createdAt: business?.createdAt ?? now,
      updatedAt: now,
    };

    setSingleton("business", profile, { summary: "Completed workspace setup" });
    toast.success("Workspace ready", "Your modules are unlocked.");
    router.replace("/dashboard");
  };

  const onContinue = (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    if (step === 0 || step === 1) persistProfile();

    if (step === STEPS.length - 1) {
      finish();
      return;
    }

    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const onBack = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <div className="grain min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center justify-between px-5 sm:px-8">
          <Logo size={28} withWordmark />
          <span className="numeric text-[11.5px] text-ink-faint">
            setup {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1040px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-4">
            <p className="numeric text-[11px] uppercase tracking-[0.24em] text-primary">
              Onboarding
            </p>
            <h1 className="serif mt-4 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.06] tracking-tight text-ink">
              Four steps, then you are trading
            </h1>

            <ol className="mt-8 space-y-1">
              {STEPS.map((item, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <li
                    key={item.key}
                    className={cn(
                      "flex items-start gap-3 rounded-input border px-4 py-3 transition-colors duration-150",
                      active
                        ? "border-primary/35 bg-primary-soft"
                        : "border-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        done
                          ? "border-primary bg-primary text-on-primary"
                          : active
                            ? "border-primary text-primary"
                            : "border-line text-ink-faint",
                      )}
                    >
                      {done ? (
                        <Icon name="approvals" size={11} strokeWidth={2} />
                      ) : (
                        <span className="numeric text-[10px]">{index + 1}</span>
                      )}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block text-[14px] font-semibold",
                          active ? "text-ink" : "text-ink-muted",
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-ink-muted">
                        {item.note}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-ink-faint">
              {user ? `Signed in as ${user.email}` : "Local session"}
            </p>
          </aside>

          <section className="lg:col-span-8">
            <form
              onSubmit={onContinue}
              className="rounded-card border border-line bg-surface p-6 card-rest sm:p-8"
              noValidate
            >
              {error ? (
                <p
                  role="alert"
                  className="mb-5 rounded-input border border-destructive/30 bg-destructive-soft px-3.5 py-2.5 text-[13px] text-destructive"
                >
                  {error}
                </p>
              ) : null}

              {step === 0 ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">Your business</h2>
                    <p className="mt-1 text-[13.5px] text-ink-muted">
                      This name appears on documents and reports.
                    </p>
                  </div>
                  <Input
                    label="Business name"
                    placeholder="Harbor Field Supply"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    required
                  />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Select
                      label="Industry"
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value as Industry)}
                      options={INDUSTRIES.map((value) => ({
                        value,
                        label: value.charAt(0).toUpperCase() + value.slice(1),
                      }))}
                    />
                    <Input
                      label="Country"
                      placeholder="USA"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">Money rules</h2>
                    <p className="mt-1 text-[13.5px] text-ink-muted">
                      These defaults seed every new document.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Select
                      label="Currency"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      options={CURRENCIES.map((value) => ({ value, label: value }))}
                    />
                    <Input
                      label="Default tax rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      mono
                      value={taxRate}
                      onChange={(event) => setTaxRate(event.target.value)}
                      trailing={<span className="text-[12px]">%</span>}
                    />
                    <Select
                      label="Payment terms"
                      hint="Applied to new customers"
                      value={terms}
                      onChange={(event) => setTerms(event.target.value)}
                      options={TERMS.map((value) => ({
                        value,
                        label: value === "0" ? "Due on receipt" : `${value} days`,
                      }))}
                    />
                    <Select
                      label="Primary metric"
                      hint="Shown first on the dashboard"
                      value={metric}
                      onChange={(event) => setMetric(event.target.value as PrimaryMetric)}
                      options={METRICS}
                    />
                  </div>
                  <Input
                    label="Revenue target"
                    hint="Optional. Leave at zero until you set a goal."
                    type="number"
                    min="0"
                    mono
                    value={revenueTarget}
                    onChange={(event) => setRevenueTarget(event.target.value)}
                    placeholder="0"
                  />
                </div>
              ) : null}

              {step === 2 ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">Where you operate</h2>
                    <p className="mt-1 text-[13.5px] text-ink-muted">
                      One branch and one warehouse are enough to start. Add more
                      from settings later.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="First branch"
                      placeholder="Main Branch"
                      value={branchName}
                      onChange={(event) => setBranchName(event.target.value)}
                      required
                    />
                    <Input
                      label="Branch city"
                      placeholder="Seattle"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </div>
                  <Input
                    label="First warehouse"
                    placeholder="Main Warehouse"
                    value={warehouseName}
                    onChange={(event) => setWarehouseName(event.target.value)}
                    required
                  />
                </div>
              ) : null}

              {step === 3 ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-[17px] font-semibold text-ink">Bring your team</h2>
                    <p className="mt-1 text-[13.5px] text-ink-muted">
                      Optional. Accounts are stored in this browser, and each
                      person picks their own password at first sign in.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="Teammate name"
                      placeholder="Mei Sato"
                      value={memberName}
                      onChange={(event) => setMemberName(event.target.value)}
                    />
                    <Input
                      label="Teammate email"
                      type="email"
                      placeholder="mei@company.com"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                    />
                  </div>
                  <Select
                    label="Role"
                    hint="Permissions follow the role matrix. Salary fields stay restricted."
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value as Role)}
                    options={TEAM_ROLES.map((value) => ({
                      value,
                      label: value.charAt(0).toUpperCase() + value.slice(1),
                    }))}
                  />
                  <p className="rounded-input border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
                    Leave this blank to add people later from Users. Nothing here
                    is required to finish.
                  </p>
                </div>
              ) : null}

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  disabled={step === 0}
                >
                  Back
                </Button>
                <Button type="submit" size="lg">
                  {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingFlow />
    </AuthGuard>
  );
}
