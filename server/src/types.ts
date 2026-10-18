export type Tier = "LOW" | "MEDIUM" | "HIGH";

/** Signals about the payment being attempted, derived from the member's history. */
export interface PaymentSignals {
  rail: "Wire" | "ACH" | "P2P" | "External Transfer" | "Cash";
  amount: number;
  recipientName: string;
  recipientIsNew: boolean;
  /** null when the member has never used this rail */
  daysSinceLastSameRail: number | null;
  /** amount divided by the member's typical outgoing payment */
  amountToBaselineRatio: number;
  availableBalance: number;
  recentPasswordReset: boolean;
  recentProfileChange: boolean;
}

/** Questionnaire answers. Empty string means not asked or skipped. */
export interface Answers {
  purpose: string;
  contactType: string;
  relationship: string;
  metInPerson: string;
  sentBefore: string;
  howContacted: string;
  actQuickly: string;
  keepPrivate: string;
  toldWhatToSay: string;
  storyChanged: string;
  calledDirectly: string;
  moneySetAside: string;
  impactIfLost: string;
  hasPlan: string;
  freeText: string;
}

export interface Reason {
  code: string;
  label: string;
  source: "pattern" | "answers" | "ai";
}
