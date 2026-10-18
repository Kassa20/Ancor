import type { Event } from "@/lib/data";

export interface TakeoverSignal {
  timestamp: string;
  label: string;
  note: string;
}

export interface PaymentRef {
  paymentId: string;
  rail: string;
  amount: number;
}

export interface TakeoverContext {
  signals: TakeoverSignal[];
  pendingPayments: PaymentRef[];
  completedUnauthorized: PaymentRef[];
  balance: number;
}

/** Event types that make up the takeover signal cluster in the kit data. */
const SIGNAL_LABELS: Record<string, string> = {
  "Failed Login": "Failed sign-in",
  "One-Time Code Sent": "One-time code sent",
  "Password Reset": "Password reset",
  "Email Change": "Email changed",
  "Phone Change": "Phone changed",
  "Recipient Added": "New recipient added",
  "Payment Initiated": "Payment started",
};

/** Look back this far before "now" for the clustered takeover activity. */
const WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Builds what the fraud specialist sees for a suspected takeover, as of `nowIso`:
 * the clustered signals, payments still pending (Sound can stop them), and
 * payments that already completed during the incident (recall needed).
 */
export function buildTakeoverContext(events: Event[], nowIso: string): TakeoverContext {
  const now = new Date(nowIso).getTime();
  const before = events.filter((e) => new Date(e.event_timestamp).getTime() <= now);
  const windowStart = now - WINDOW_MS;
  const inWindow = before.filter((e) => new Date(e.event_timestamp).getTime() >= windowStart);

  const signals = inWindow
    .filter((e) => SIGNAL_LABELS[e.event_type] && (e.event_type !== "Payment Initiated" || e.recipient_status === "New"))
    .map((e) => ({
      timestamp: e.event_timestamp,
      label:
        e.event_type === "Payment Initiated"
          ? `${SIGNAL_LABELS[e.event_type]}: $${parseFloat(e.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${e.payment_rail} to new recipient`
          : SIGNAL_LABELS[e.event_type],
      note: e.event_note,
    }));

  // Latest status per payment in the window.
  const latest = new Map<string, Event>();
  for (const e of inWindow) if (e.payment_id) latest.set(e.payment_id, e);
  const toRef = (e: Event): PaymentRef => ({ paymentId: e.payment_id, rail: e.payment_rail, amount: parseFloat(e.amount) });
  const incident = [...latest.values()].filter((e) => e.recipient_status === "New");

  let balance = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const b = parseFloat(before[i].available_balance_after);
    if (Number.isFinite(b) && b > 0) {
      balance = b;
      break;
    }
  }

  return {
    signals,
    pendingPayments: incident.filter((e) => e.payment_status === "Pending").map(toRef),
    completedUnauthorized: incident.filter((e) => e.payment_status === "Completed").map(toRef),
    balance,
  };
}
