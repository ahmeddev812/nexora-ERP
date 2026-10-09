"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

const RADIUS = 17;
const CENTER = 24;

const NODES = Array.from({ length: 6 }, (_, index) => {
  const angle = (-90 + index * 60) * (Math.PI / 180);
  return {
    x: Number((CENTER + RADIUS * Math.cos(angle)).toFixed(2)),
    y: Number((CENTER + RADIUS * Math.sin(angle)).toFixed(2)),
  };
});

const HEX_POINTS = NODES.map((node) => `${node.x},${node.y}`).join(" ");

/**
 * NEXORA mark: a hexagon (six connected modules) with six glowing nodes on an
 * emerald to gold gradient. Pure CSS motion, no framer-motion, and it stops
 * entirely under prefers-reduced-motion.
 */
export function Logo({
  size = 32,
  withWordmark = false,
  className,
  wordmarkClassName,
}: LogoProps) {
  const uid = useId();
  const gradientId = `nexora-grad-${uid.replace(/:/g, "")}`;
  const glowId = `nexora-glow-${uid.replace(/:/g, "")}`;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.15 160)" />
            <stop offset="100%" stopColor="oklch(0.75 0.15 85)" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points={HEX_POINTS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinejoin="round"
          className="logo-ring"
        />

        <path
          d="M16 24h3.4l2.2-5.6 3 11.2 2.1-5.6H32"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        <g filter={`url(#${glowId})`}>
          {NODES.map((node, index) => (
            <circle
              key={index}
              cx={node.x}
              cy={node.y}
              r="3"
              fill={index % 2 === 0 ? "oklch(0.55 0.15 160)" : "oklch(0.75 0.15 85)"}
              className="logo-node"
              style={{ animationDelay: `${index * 0.32}s` }}
            />
          ))}
        </g>
      </svg>

      {withWordmark ? (
        <span
          className={cn(
            "serif text-[19px] leading-none tracking-[0.14em] text-ink",
            wordmarkClassName,
          )}
        >
          NEXORA
        </span>
      ) : null}
    </span>
  );
}
