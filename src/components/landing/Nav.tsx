"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#preview", label: "Workspace" },
  { href: "#modules", label: "Modules" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-200",
        scrolled
          ? "glass border-b border-line"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="focus-ring-visible rounded-tag" aria-label="NEXORA home">
          <Logo size={28} withWordmark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring-visible rounded-tag text-[13.5px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button href="/signup" size="sm">
            Open workspace
          </Button>
        </div>
      </div>
    </header>
  );
}
