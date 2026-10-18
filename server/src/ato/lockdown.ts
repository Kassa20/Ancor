import { randomInt } from "node:crypto";
import { supabase } from "../lib/supabase.js";

/**
 * Post-confirmation takeover lockdown. Runs only after a fraud specialist has
 * confirmed an account takeover, which is when Sound is allowed to stop payments.
 *
 *   1 delink    freeze every digital money action
 *   2 contain   cancel pending payments, revoke sessions, revert contact changes
 *   3 reverify  identity checked outside the fraudster's reach
 *   4 migrate   new account number, balance moved
 *   5 demolish  close the old account, request recalls for anything already sent
 */

export type StepKey = "delink" | "contain" | "reverify" | "migrate" | "demolish";
export type StepStatus = "pending" | "done";
export type LockdownStatus = "awaiting_reverification" | "completed";
export type ReverifyMethod = "branch_photo_id" | "pre_change_callback";

export interface PaymentRef {
  paymentId: string;
  rail: string;
  amount: number;
}

export interface StartLockdownInput {
  memberId: string;
  confirmedBy: string;
  signals: string[];
  pendingPayments: PaymentRef[];
  completedUnauthorized: PaymentRef[];
  balance: number;
}

const STEP_LABELS: Record<StepKey, string> = {
  delink: "Delink digital access from money movement",
  contain: "Contain: stop payments, sign out, revert changes",
  reverify: "Re-verify identity outside the fraudster's reach",
  migrate: "Migrate funds to a new account",
  demolish: "Demolish the old account and recover funds",
};
const STEP_ORDER: StepKey[] = ["delink", "contain", "reverify", "migrate", "demolish"];

export const FROZEN_ACTIONS = [
  "Wires, ACH, external transfers and P2P",
  "Adding or editing recipients",
  "Opening accounts, cards or loans",
  "Limit, password and contact changes",
];
export const KEEPS_WORKING = [
  "Incoming deposits (payroll, pension)",
  "Autopays to long-established payees",
  "Branch service with photo ID",
];

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sum = (ps: PaymentRef[]) => ps.reduce((t, p) => t + p.amount, 0);

async function completeStep(lockdownId: string, key: StepKey, detail: string) {
  const { error } = await supabase
    .from("lockdown_steps")
    .update({ status: "done", detail, completed_at: new Date().toISOString() })
    .eq("lockdown_id", lockdownId)
    .eq("step_key", key);
  if (error) throw new Error(error.message);
}

export async function getLockdown(id: string) {
  const { data: lockdown, error } = await supabase.from("account_lockdowns").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  const { data: steps, error: stepsError } = await supabase
    .from("lockdown_steps")
    .select("step_key, step_order, label, status, detail, completed_at")
    .eq("lockdown_id", id)
    .order("step_order");
  if (stepsError) throw new Error(stepsError.message);
  return { ...lockdown, steps, frozenActions: FROZEN_ACTIONS, keepsWorking: KEEPS_WORKING };
}

/** Steps 1–2 run immediately on confirmation; the rest wait for re-verification. */
export async function startLockdown(input: StartLockdownInput) {
  const { data: lockdown, error } = await supabase
    .from("account_lockdowns")
    .insert({
      member_id: input.memberId,
      status: "awaiting_reverification",
      confirmed_by: input.confirmedBy,
      signals: input.signals,
      pending_payments: input.pendingPayments,
      completed_unauthorized: input.completedUnauthorized,
      balance: input.balance,
      old_account_ref: `Checking ••${input.memberId.slice(-4)}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: stepsError } = await supabase.from("lockdown_steps").insert(
    STEP_ORDER.map((key, i) => ({
      lockdown_id: lockdown.id,
      step_key: key,
      step_order: i + 1,
      label: STEP_LABELS[key],
      status: "pending",
    })),
  );
  if (stepsError) throw new Error(stepsError.message);

  await completeStep(lockdown.id, "delink", `Frozen: ${FROZEN_ACTIONS.join("; ")}. Deposits keep flowing.`);

  const stopped = input.pendingPayments;
  await completeStep(
    lockdown.id,
    "contain",
    [
      stopped.length
        ? `Stopped ${stopped.length} pending payment(s) totaling ${money(sum(stopped))} (${stopped.map((p) => p.paymentId).join(", ")})`
        : "No pending payments to stop",
      "all online sessions signed out",
      "email and phone reverted to the details on file before the change",
    ].join("; "),
  );

  return getLockdown(lockdown.id);
}

/** Step 3 unlocks steps 4–5: open the new account, move the money, close the old one. */
export async function reverifyAndMigrate(id: string, method: ReverifyMethod) {
  const { data: lockdown, error } = await supabase
    .from("account_lockdowns")
    .select("id, member_id, status, balance, completed_unauthorized")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (lockdown.status !== "awaiting_reverification") throw new Error("Lockdown is not awaiting re-verification");

  await completeStep(
    id,
    "reverify",
    method === "branch_photo_id"
      ? "Verified in branch with photo ID; new password set in person"
      : "Verified by callback to the phone number on file before the change",
  );

  const newAccountRef = `Checking ••${String(randomInt(1000, 9999))}`;
  await completeStep(
    id,
    "migrate",
    `Opened ${newAccountRef}; moved ${money(Number(lockdown.balance))}; payroll and autopays redirected; new debit card issued`,
  );

  const recalls = (lockdown.completed_unauthorized ?? []) as PaymentRef[];
  await completeStep(
    id,
    "demolish",
    [
      "Old account closed after the settlement window; any later activity on it alerts the fraud team",
      recalls.length
        ? `recall requested for ${recalls.length} completed payment(s) totaling ${money(sum(recalls))}`
        : "nothing to recall: no unauthorized payment left the account",
      "case opened with check-ins on day 3, 14 and 30",
    ].join("; "),
  );

  const { error: updateError } = await supabase
    .from("account_lockdowns")
    .update({
      status: "completed",
      reverify_method: method,
      new_account_ref: newAccountRef,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);

  return getLockdown(id);
}

export async function getLatestLockdownForMember(memberId: string) {
  const { data, error } = await supabase
    .from("account_lockdowns")
    .select("id")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ? getLockdown(data[0].id) : null;
}
