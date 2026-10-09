"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";

interface RoutePlaceholderProps {
  label: string;
  group: string;
  icon: IconName;
  path: string;
}

export function RoutePlaceholder({ label, group, icon, path }: RoutePlaceholderProps) {
  return (
    <AppShell>
      <PageHeader
        title={label}
        description={`${group} · ${path}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label }]}
        actions={
          <Button variant="secondary" size="sm" href="/dashboard">
            Back to dashboard
          </Button>
        }
      />

      <EmptyState
        icon={<Icon name={icon} size={18} strokeWidth={1.5} />}
        title={`${label} arrives in a later build`}
        description="This screen is in the build queue behind the dashboard. The figures it will show are already computed from your documents, so nothing is missing."
        action={
          <Button variant="secondary" size="sm" href="/dashboard">
            Open dashboard
          </Button>
        }
      />
    </AppShell>
  );
}
