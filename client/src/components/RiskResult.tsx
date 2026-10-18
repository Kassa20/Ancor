import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api, type AlertDelivery, type Decision, type RiskScoreResult } from "@/lib/api";
import { formatCurrency } from "@/lib/data";
import type { PaymentSignals, Tier } from "@/lib/payment";

const TIER_STYLE: Record<Tier, { text: string; bg: string; label: string }> = {
  HIGH: { text: "text-red-600", bg: "bg-red-50 border-red-200", label: "High risk" },
  MEDIUM: { text: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Some warning signs" },
  LOW: { text: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Low risk" },
};

const TYPOLOGY_LABEL: Record<string, string> = {
  FAMILY_EMERGENCY: "Looks like a family-emergency scam",
  ROMANCE_INVESTMENT: "Looks like a romance or investment scam",
  IMPERSONATION: "Looks like an impersonation scam",
  GOVERNMENT_TECH_SUPPORT: "Looks like a government or tech-support scam",
  LEGITIMATE: "Looks like a legitimate payment",
  UNCLEAR: "Pattern unclear",
};

const OUTCOME: Record<Decision, string> = {
  talk: "A Sound fraud specialist will call you within 15 minutes. Your payment stays on hold until you've talked.",
  wait: "Your payment is saved and on hold. Nothing will be sent unless you come back and confirm.",
  cancel: "Your payment was cancelled and a report was opened. A specialist will follow up to help.",
  send: "Your payment is on its way.",
};

function AlertList({ alerts }: { alerts: AlertDelivery[] }) {
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.contactId} className="flex items-center gap-2 text-sm">
          {a.status === "suppressed" || a.status === "failed" ? (
            <XCircle className="size-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-600" />
          )}
          <span>
            {a.status === "suppressed"
              ? `${a.contactName} not alerted; a Sound employee will review instead`
              : a.status === "failed"
                ? `Couldn't reach ${a.contactName}`
                : `Alert sent to ${a.contactName}${a.status === "simulated" ? " (demo)" : ""}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RiskResult({
  memberId,
  memberFirstName,
  payment,
  result,
  hasTrustedContact,
  onAddTrustedContact,
  onFinish,
}: {
  memberId: string;
  memberFirstName: string;
  payment: PaymentSignals;
  result: RiskScoreResult;
  hasTrustedContact: boolean;
  onAddTrustedContact: () => void;
  onFinish: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertDelivery[]>(result.alerts);
  const [alerting, setAlerting] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);

  const alertContacts = async () => {
    setAlerting(true);
    try {
      const r = await api.alertTrustedContacts({
        memberId,
        memberFirstName,
        assessmentId: result.assessmentId,
        recipientName: payment.recipientName,
      });
      setAlerts(r.alerts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAlerting(false);
    }
  };

  const decide = async (d: Decision) => {
    setDecision(d);
    if (result.assessmentId) {
      await api.recordDecision(result.assessmentId, d).catch((e: Error) => console.error(e));
    }
  };

  if (decision) {
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldCheck className="mx-auto size-12 text-primary" />
        <p className="text-lg">{OUTCOME[decision === "send" && result.tier === "HIGH" ? "talk" : decision]}</p>
        {decision === "send" && result.tier === "HIGH" && (
          <p className="text-sm text-muted-foreground">
            Because this payment is high risk, a specialist will call before it's released. You keep the final say.
          </p>
        )}
        <button
          onClick={onFinish}
          className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const style = TIER_STYLE[result.tier];
  const autoAlerted = alerts.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className={`rounded-2xl border-2 p-6 ${style.bg}`}>
        <div className="flex items-center gap-5">
          <div className={`text-6xl font-bold tabular-nums ${style.text}`}>{result.score}</div>
          <div>
            <p className={`text-lg font-bold ${style.text}`}>{style.label}</p>
            <p className="text-sm text-muted-foreground">out of 100 · {TYPOLOGY_LABEL[result.typology] ?? result.typology}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(payment.amount)} {payment.rail.toLowerCase()} to {payment.recipientName}
            </p>
          </div>
        </div>
        {result.rationale && <p className="mt-4 text-base">{result.rationale}</p>}
      </div>

      {result.reasons.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="size-5 text-amber-600" />
            Why we're concerned
          </h3>
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li key={`${r.code}-${i}`} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
        {(
          [
            ["Your history", result.components.pattern],
            ["Your answers", result.components.answers],
            [result.aiUsed ? "AI review" : "AI review (off)", result.components.ai],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${v * 100}%` }} />
            </div>
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Bell className="size-5 text-primary" />
          Trusted contacts
        </h3>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {autoAlerted ? (
          <>
            <AlertList alerts={alerts} />
            <p className="text-xs text-muted-foreground">
              They're told only that you're making an unusual payment. They can't see your balance or approve
              anything. You stay in control.
            </p>
          </>
        ) : hasTrustedContact ? (
          <button
            onClick={alertContacts}
            disabled={alerting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary px-5 py-3 font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            {alerting ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
            Alert my trusted contacts
          </button>
        ) : (
          <button onClick={onAddTrustedContact} className="text-sm font-medium text-primary hover:underline">
            Add a trusted contact
          </button>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Your decision</h3>
        {result.tier === "LOW" ? (
          <DecisionButton icon={<Send className="size-5 text-primary" />} title="Send payment" subtitle="No warning signs found" primary onClick={() => decide("send")} />
        ) : (
          <>
            <DecisionButton icon={<MessageCircle className="size-5 text-primary" />} title="Talk to Sound now" subtitle="Recommended: speak with a fraud specialist" primary onClick={() => decide("talk")} />
            <DecisionButton icon={<Clock className="size-5 text-muted-foreground" />} title="Wait 24 hours" subtitle="Your payment is saved; take time to think" onClick={() => decide("wait")} />
            <DecisionButton icon={<XCircle className="size-5 text-muted-foreground" />} title="Cancel and report" subtitle="Cancel the payment and file a report" onClick={() => decide("cancel")} />
            <DecisionButton
              icon={<Send className="size-5 text-muted-foreground" />}
              title="Send anyway"
              subtitle={result.tier === "HIGH" ? "A specialist calls first. You keep the final say." : "Proceed with the payment"}
              onClick={() => decide("send")}
            />
          </>
        )}
      </div>
    </div>
  );
}

function DecisionButton({
  icon,
  title,
  subtitle,
  primary,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-colors ${
        primary ? "border-primary bg-primary/5 hover:bg-primary/10" : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div>
        <p className={`font-semibold ${primary ? "text-primary" : ""}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
