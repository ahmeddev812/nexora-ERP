import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "numeric text-[11px] uppercase tracking-[0.24em] text-primary",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface SectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function Section({ id, children, className, containerClassName }: SectionProps) {
  return (
    <section id={id} className={cn("relative scroll-mt-24", className)}>
      <div className={cn("mx-auto w-full max-w-[1180px] px-5 sm:px-8", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "wide";
  className?: string;
}) {
  return (
    <div className={cn(align === "wide" ? "max-w-3xl" : "max-w-2xl", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="serif mt-4 text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.06] tracking-tight text-ink">
        {title}
      </h2>
      {lead ? (
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">{lead}</p>
      ) : null}
    </div>
  );
}
