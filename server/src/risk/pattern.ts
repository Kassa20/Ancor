import type { PaymentSignals, Reason, Tier } from "../types.js";

/** Rails Sound can hold for up to 4 hours, plus cash and P2P which need a pre-submit pause. */
const HIGH_VALUE_RAILS = new Set(["Wire", "External Transfer", "Cash"]);

/**
 * Pattern score (0–1): how far this payment breaks the member's own history.
 * Uses only the signals the challenge allows: amount, rail, recipient, balance,
 * and recent profile/password events.
 */
export function scorePattern(p: PaymentSignals): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let points = 0;
  const add = (pts: number, code: string, label: string) => {
    points += pts;
    reasons.push({ code, label, source: "pattern" });
  };

  if (HIGH_VALUE_RAILS.has(p.rail) && (p.daysSinceLastSameRail === null || p.daysSinceLastSameRail > 365)) {
    const years = p.daysSinceLastSameRail ? Math.floor(p.daysSinceLastSameRail / 365) : null;
    add(25, "FIRST_USE_OF_RAIL", years ? `First ${p.rail.toLowerCase()} in ${years}+ years` : `First ${p.rail.toLowerCase()} on this account`);
  }
  if (p.recipientIsNew) add(20, "NEW_RECIPIENT", "Sending to someone you haven't paid before");
  if (p.amountToBaselineRatio >= 3) add(25, "AMOUNT_OUTLIER", "Amount is far above your usual payments");
  else if (p.amountToBaselineRatio >= 1.5) add(12, "AMOUNT_ABOVE_TYPICAL", "Amount is above your usual payments");
  if (p.availableBalance > 0 && p.amount / p.availableBalance >= 0.15)
    add(10, "LARGE_SHARE_OF_BALANCE", "A large share of your available balance");
  if (p.recentPasswordReset || p.recentProfileChange)
    add(20, "RECENT_ACCOUNT_CHANGES", "Recent password or contact-info change");

  return { score: Math.min(points, 100) / 100, reasons };
}

/** Tier before any questions are asked. Decides how much friction the member sees. */
export function precheckTier(patternScore: number): Tier {
  if (patternScore >= 0.5) return "HIGH";
  if (patternScore >= 0.25) return "MEDIUM";
  return "LOW";
}
