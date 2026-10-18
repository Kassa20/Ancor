import type { Event } from "@/lib/data";

export type Rail = "Wire" | "ACH" | "P2P" | "External Transfer" | "Cash";
export type Tier = "LOW" | "MEDIUM" | "HIGH";

/** Signals sent to the risk API. Mirrors server/src/types.ts. */
export interface PaymentSignals {
  rail: Rail;
  amount: number;
  recipientName: string;
  recipientIsNew: boolean;
  daysSinceLastSameRail: number | null;
  amountToBaselineRatio: number;
  availableBalance: number;
  recentPasswordReset: boolean;
  recentProfileChange: boolean;
}

export interface PaymentDraft {
  rail: Rail;
  amount: number;
  recipientName: string;
  recipientIsNew: boolean;
}

export interface DemoMember {
  id: string;
  firstName: string;
  label: string;
  /** Which Anchor module this persona demonstrates. */
  module: "pause-and-reflect" | "takeover-lockdown";
  /** "Now" for the demo: the moment just before the payment attempt in the synthetic data. */
  now: string;
  preset: PaymentDraft;
}

export const DEMO_MEMBERS: DemoMember[] = [
  {
    id: "M1001",
    firstName: "Linda",
    label: "Linda · family emergency scam",
    module: "pause-and-reflect",
    now: "2026-10-20T14:00:00",
    preset: { rail: "Wire", amount: 8500, recipientName: "Robert Hale, Esq.", recipientIsNew: true },
  },
  {
    id: "M1057",
    firstName: "Alex",
    label: "Alex · legitimate home-closing wire",
    module: "pause-and-reflect",
    now: "2026-10-19T09:30:00",
    preset: { rail: "Wire", amount: 51586.52, recipientName: "Evergreen Title & Escrow", recipientIsNew: true },
  },
  {
    id: "M1003",
    firstName: "Sarah",
    label: "Sarah · account takeover",
    module: "takeover-lockdown",
    // Just after the fraudster started two P2P payments, before they completed at 10:36 PM.
    now: "2026-10-15T22:31:00",
    preset: { rail: "P2P", amount: 1574.18, recipientName: "New recipient", recipientIsNew: true },
  },
];

const DAY_MS = 86_400_000;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Builds the risk signals for a draft payment from the member's own history.
 * The events file stands in for Sound's read-only core-banking feed.
 */
export function buildPaymentSignals(events: Event[], draft: PaymentDraft, nowIso: string): PaymentSignals {
  const now = new Date(nowIso).getTime();
  const before = events.filter((e) => new Date(e.event_timestamp).getTime() < now);

  // Member baseline: the typical payment the data already measures each amount against.
  const baseline = median(
    events
      .map((e) => parseFloat(e.amount) / parseFloat(e.amount_to_baseline_ratio))
      .filter((v) => Number.isFinite(v) && v > 0),
  );

  // Last use of this rail: completed payments before now, plus the history each
  // same-rail event records about the rail's previous use.
  const lastUses: number[] = [];
  for (const e of events) {
    if (e.payment_rail !== draft.rail) continue;
    const ts = new Date(e.event_timestamp).getTime();
    if (ts < now && e.transaction_direction === "Outgoing" && e.payment_status === "Completed") lastUses.push(ts);
    const prior = parseFloat(e.days_since_last_same_rail);
    if (Number.isFinite(prior) && ts - prior * DAY_MS < now) lastUses.push(ts - prior * DAY_MS);
  }
  const lastUse = lastUses.length ? Math.max(...lastUses) : null;

  let balance = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const b = parseFloat(before[i].available_balance_after);
    if (Number.isFinite(b) && b > 0) {
      balance = b;
      break;
    }
  }
  const latest = before[before.length - 1];

  return {
    rail: draft.rail,
    amount: draft.amount,
    recipientName: draft.recipientName,
    recipientIsNew: draft.recipientIsNew,
    daysSinceLastSameRail: lastUse === null ? null : Math.floor((now - lastUse) / DAY_MS),
    amountToBaselineRatio: baseline ? Math.round((draft.amount / baseline) * 100) / 100 : 1,
    availableBalance: balance,
    recentPasswordReset: latest?.password_reset_recent === "Yes",
    recentProfileChange: latest?.profile_change_recent === "Yes",
  };
}
