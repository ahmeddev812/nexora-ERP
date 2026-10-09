"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-7", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-faint">
            <li>
              <Link
                href="/dashboard"
                aria-label="Dashboard"
                className="focus-ring-visible rounded-tag transition-colors hover:text-ink"
              >
                <Home size={13} strokeWidth={1.5} />
              </Link>
            </li>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  <li aria-hidden="true">
                    <ChevronRight size={12} strokeWidth={1.5} />
                  </li>
                  <li className="flex items-center gap-1.5">
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="focus-ring-visible rounded-tag transition-colors hover:text-ink"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={isLast ? "text-ink-muted" : undefined}
                        aria-current={isLast ? "page" : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="serif text-[32px] leading-tight tracking-tight text-ink sm:text-[36px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
