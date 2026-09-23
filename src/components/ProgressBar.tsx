import { formatMoney } from "@/lib/money";

export function ProgressBar({ current, goal, label = "monthly support" }: { current: number; goal: number; label?: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
        <span>
          <strong className="text-lg">{formatMoney(current)}</strong> <span className="text-muted">of {formatMoney(goal)} {label}</span>
        </span>
        <span className="font-semibold text-brand">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
