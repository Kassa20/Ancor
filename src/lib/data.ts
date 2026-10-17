import eventsData from "@/data/events.json";
import membersData from "@/data/members.json";

export interface Event {
  event_id: string;
  synthetic_member_id: string;
  event_sequence: string;
  event_timestamp: string;
  day_of_week: string;
  event_category: string;
  event_type: string;
  channel: string;
  payment_id: string;
  payment_rail: string;
  amount: string;
  transaction_direction: string;
  recipient_id: string;
  recipient_status: string;
  recipient_age_days: string;
  days_since_last_same_rail: string;
  amount_to_baseline_ratio: string;
  amount_vs_member_baseline: string;
  payment_velocity_band: string;
  available_balance_after: string;
  profile_change_recent: string;
  password_reset_recent: string;
  trusted_contact_enrolled: string;
  warning_displayed: string;
  member_response: string;
  employee_interaction: string;
  case_open: string;
  payment_status: string;
  event_note: string;
}

export interface Member {
  synthetic_member_id: string;
  anchor_persona: string;
  scenario_type: string;
  scenario_subtype: string;
  is_legitimate_lookalike: string;
  journey_summary: string;
  incident_start: string;
  first_intervention: string;
  journey_outcome: string;
  scam_payment_ids: string;
  dollars_attempted: string;
  dollars_sent: string;
  dollars_prevented: string;
  dollars_recovered: string;
  net_member_loss: string;
  intervention_candidate: string;
}

const events = eventsData as Event[];
const members = membersData as Member[];

export function getMember(id: string): Member | undefined {
  return members.find((m) => m.synthetic_member_id === id);
}

export function getMemberEvents(id: string): Event[] {
  return events.filter((e) => e.synthetic_member_id === id);
}

export function getMoneyMovementEvents(memberEvents: Event[]): Event[] {
  return memberEvents.filter((e) => e.event_category === "Money Movement");
}

export function parseAmount(amount: string): number {
  return parseFloat(amount) || 0;
}

export function parseTimestamp(ts: string): Date {
  return new Date(ts);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(ts: string): string {
  const date = parseTimestamp(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(ts: string): string {
  const date = parseTimestamp(ts);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function groupEventsByDate(
  events: Event[]
): { date: string; events: Event[] }[] {
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const dateKey = formatDate(event.event_timestamp);
    const group = groups.get(dateKey);
    if (group) {
      group.push(event);
    } else {
      groups.set(dateKey, [event]);
    }
  }
  return Array.from(groups.entries()).map(([date, events]) => ({
    date,
    events,
  }));
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  "Bill Payment": "Bill Payment",
  "Debit Purchase": "Debit Card Purchase",
  Deposit: "Direct Deposit",
  "ATM Withdrawal": "ATM Withdrawal",
  "Automatic Payment": "Auto Pay",
  "Payment Initiated": "Payment",
  "Payment Completed": "Payment Sent",
  "Payment Held": "Payment On Hold",
  "Payment Released": "Payment Released",
  "Payment Cancelled": "Payment Cancelled",
  Login: "Sign In",
  "Branch Visit": "Branch Visit",
  "Recipient Added": "New Recipient Added",
  "Confirmation Requested": "Verification Required",
  "Employee Outreach": "Sound CU Outreach",
  "Employee Escalation": "Review Escalated",
  "Trusted Contact Offered": "Trusted Contact Offered",
  "Scam Reported": "Fraud Report Filed",
  "Case Created": "Case Opened",
  "Recovery Request": "Recovery Request",
  "Recovery Unsuccessful": "Recovery Unsuccessful",
};

export function getEventLabel(event: Event): string {
  return EVENT_TYPE_LABELS[event.event_type] || event.event_type;
}

export function getLatestBalance(memberEvents: Event[]): number {
  for (let i = memberEvents.length - 1; i >= 0; i--) {
    const bal = parseFloat(memberEvents[i].available_balance_after);
    if (!isNaN(bal) && bal > 0) return bal;
  }
  return 0;
}
