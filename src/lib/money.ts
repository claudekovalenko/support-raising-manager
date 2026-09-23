export const INTERVALS = ["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"] as const;
export type Interval = (typeof INTERVALS)[number];

export const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  ANNUAL: "yearly",
  ONE_TIME: "one-time",
};

export function formatMoney(cents: number, opts: { cents?: boolean } = {}) {
  const showCents = opts.cents ?? cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

/** Normalizes a recurring pledge to its monthly equivalent. One-time gifts count as 0. */
export function monthlyEquivalent(amountCents: number, interval: string) {
  switch (interval) {
    case "MONTHLY":
      return amountCents;
    case "QUARTERLY":
      return Math.round(amountCents / 3);
    case "ANNUAL":
      return Math.round(amountCents / 12);
    default:
      return 0;
  }
}

/** Parses "25", "25.50", "$1,000" into cents. Returns null when invalid. */
export function parseDollars(input: FormDataEntryValue | null): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return cents > 0 ? cents : null;
}
