"use client";

import type { ScoreBreakdown } from "@/lib/types";

const labels: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "correctness", label: "Correctness" },
  { key: "clarity", label: "Clarity" },
  { key: "structure", label: "Structure" },
];

export function ScoreBars({ scores, size = "md" }: { scores: ScoreBreakdown; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-2" : "h-2.5";
  return (
    <div className="space-y-3">
      {labels.map(({ key, label }) => (
        <div key={key}>
          <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
            <span>{label}</span>
            <span className="text-[var(--text)] tabular-nums">{scores[key]}</span>
          </div>
          <div className={`w-full rounded-full bg-[var(--surface2)] ${h}`}>
            <div
              className={`${h} rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] transition-all duration-500`}
              style={{ width: `${scores[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
