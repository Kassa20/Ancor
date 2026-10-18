import type { PaymentSignals, Tier } from "@/lib/payment";
import type { PaymentRef } from "@/lib/ato";

export interface Reason {
  code: string;
  label: string;
  source: "pattern" | "answers" | "ai";
}

export interface PrecheckResult {
  tier: Tier;
  patternScore: number;
  reasons: Reason[];
}

export interface AlertDelivery {
  contactId: string;
  contactName: string;
  channel: "sms" | "email" | "none";
  status: "sent" | "simulated" | "suppressed" | "failed";
  detail?: string;
}

export interface RiskScoreResult {
  assessmentId: string | null;
  score: number;
  tier: Tier;
  typology: string;
  rationale: string;
  reasons: Reason[];
  actions: string[];
  components: { pattern: number; answers: number; ai: number };
  aiUsed: boolean;
  alerts: AlertDelivery[];
}

export interface TrustedContactRecord {
  id: string;
  member_id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  auto_alert: boolean;
}

export type Decision = "talk" | "wait" | "cancel" | "send";

export interface LockdownStep {
  step_key: "delink" | "contain" | "reverify" | "migrate" | "demolish";
  step_order: number;
  label: string;
  status: "pending" | "done";
  detail: string | null;
  completed_at: string | null;
}

export interface Lockdown {
  id: string;
  member_id: string;
  status: "awaiting_reverification" | "completed";
  confirmed_by: string;
  balance: number;
  old_account_ref: string;
  new_account_ref: string | null;
  reverify_method: "branch_photo_id" | "pre_change_callback" | null;
  created_at: string;
  steps: LockdownStep[];
  frozenActions: string[];
  keepsWorking: string[];
}

// Dev requests go through the Vite proxy; set VITE_API_URL when the API is hosted elsewhere.
const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  precheck: (payment: PaymentSignals) =>
    request<PrecheckResult>("/api/risk/precheck", { method: "POST", body: JSON.stringify({ payment }) }),

  score: (body: { memberId: string; memberFirstName: string; payment: PaymentSignals; answers: object }) =>
    request<RiskScoreResult>("/api/risk/score", { method: "POST", body: JSON.stringify(body) }),

  recordDecision: (assessmentId: string, decision: Decision) =>
    request<{ ok: true }>(`/api/risk/assessments/${assessmentId}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    }),

  alertTrustedContacts: (body: {
    memberId: string;
    memberFirstName: string;
    assessmentId: string | null;
    recipientName: string;
  }) => request<{ alerts: AlertDelivery[] }>("/api/alerts/trusted-contacts", { method: "POST", body: JSON.stringify(body) }),

  listTrustedContacts: (memberId: string) =>
    request<TrustedContactRecord[]>(`/api/members/${memberId}/trusted-contacts`),

  addTrustedContact: (
    memberId: string,
    c: { name: string; relationship: string; phone: string; email: string; autoAlert: boolean },
  ) => request<TrustedContactRecord>(`/api/members/${memberId}/trusted-contacts`, { method: "POST", body: JSON.stringify(c) }),

  removeTrustedContact: (contactId: string) =>
    request<void>(`/api/trusted-contacts/${contactId}`, { method: "DELETE" }),

  confirmTakeover: (body: {
    memberId: string;
    confirmedBy: string;
    signals: string[];
    pendingPayments: PaymentRef[];
    completedUnauthorized: PaymentRef[];
    balance: number;
  }) => request<Lockdown>("/api/ato/lockdowns", { method: "POST", body: JSON.stringify(body) }),

  reverify: (lockdownId: string, method: "branch_photo_id" | "pre_change_callback") =>
    request<Lockdown>(`/api/ato/lockdowns/${lockdownId}/reverify`, { method: "POST", body: JSON.stringify({ method }) }),

  getMemberLockdown: (memberId: string) => request<Lockdown | null>(`/api/members/${memberId}/lockdown`),
};
