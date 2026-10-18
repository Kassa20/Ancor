import { useMemo, useState } from "react";
import { AlertTriangle, Building2, Loader2, Lock, Phone, ShieldCheck } from "lucide-react";
import { api, type Lockdown } from "@/lib/api";
import { buildTakeoverContext } from "@/lib/ato";
import { formatCurrency, formatTime, type Event } from "@/lib/data";
import { LockdownSteps } from "./LockdownSteps";

/** Employee view: confirm a takeover, then walk the lockdown to completion. */
export function TakeoverConsole({
  memberId,
  memberName,
  events,
  now,
  lockdown,
  onLockdownChange,
}: {
  memberId: string;
  memberName: string;
  events: Event[];
  now: string;
  lockdown: Lockdown | null;
  onLockdownChange: (l: Lockdown) => void;
}) {
  const ctx = useMemo(() => buildTakeoverContext(events, now), [events, now]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<Lockdown>) => {
    setBusy(true);
    setError(null);
    try {
      onLockdownChange(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    run(() =>
      api.confirmTakeover({
        memberId,
        confirmedBy: "Fraud specialist (demo)",
        signals: ctx.signals.map((s) => `${s.timestamp} ${s.label}`),
        pendingPayments: ctx.pendingPayments,
        completedUnauthorized: ctx.completedUnauthorized,
        balance: ctx.balance,
      }),
    );

  const pendingTotal = ctx.pendingPayments.reduce((t, p) => t + p.amount, 0);
  const sentTotal = ctx.completedUnauthorized.reduce((t, p) => t + p.amount, 0);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-red-600" />
          <h2 className="text-lg font-semibold">Takeover signals · {memberName} ({memberId})</h2>
        </div>
        <ol className="space-y-2">
          {ctx.signals.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{formatTime(s.timestamp)}</span>
              <span>
                <span className="font-medium">{s.label}</span>
                {s.note && <span className="block text-xs text-muted-foreground">{s.note}</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs text-red-700">Pending, can be stopped</p>
            <p className="text-lg font-bold text-red-700">{formatCurrency(pendingTotal)}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Already sent, needs recall</p>
            <p className="text-lg font-bold">{formatCurrency(sentTotal)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Confirmations sent to the new email or phone reach the fraudster. Verification uses the details on file before
          the change.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Lock className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Takeover lockdown</h2>
        </div>

        {!lockdown ? (
          <>
            <p className="text-sm text-muted-foreground">
              Once you confirm this is a takeover, Anchor cuts digital access from every money action and stops the
              pending payments immediately.
            </p>
            <button
              onClick={confirm}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Confirm account takeover
            </button>
          </>
        ) : (
          <>
            <LockdownSteps steps={lockdown.steps} showDetail />
            {lockdown.status === "awaiting_reverification" && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Re-verify {memberName} to open her new account:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => run(() => api.reverify(lockdown.id, "pre_change_callback"))}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Phone className="size-4" />
                    Callback to pre-change phone
                  </button>
                  <button
                    onClick={() => run(() => api.reverify(lockdown.id, "branch_photo_id"))}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Building2 className="size-4" />
                    Branch, photo ID
                  </button>
                </div>
              </div>
            )}
            {lockdown.status === "completed" && (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <ShieldCheck className="size-5 shrink-0" />
                {formatCurrency(Number(lockdown.balance))} now in {lockdown.new_account_ref}. {lockdown.old_account_ref} is
                closed.
              </div>
            )}
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
