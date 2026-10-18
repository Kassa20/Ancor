import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import type { PaymentDraft, Rail } from "@/lib/payment";

const RAILS: Rail[] = ["Wire", "External Transfer", "ACH", "P2P"];

export function SendMoney({
  preset,
  sentAmount,
  checking,
  error,
  onSubmit,
  onDone,
}: {
  preset: PaymentDraft;
  /** Set when the payment went through with no friction (LOW tier). */
  sentAmount: number | null;
  checking: boolean;
  error: string | null;
  onSubmit: (draft: PaymentDraft) => void;
  onDone: () => void;
}) {
  const [rail, setRail] = useState<Rail>("P2P");
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientIsNew, setRecipientIsNew] = useState(false);

  const amountNum = parseFloat(amount);
  const canSubmit = recipientName.trim() && Number.isFinite(amountNum) && amountNum > 0 && !checking;

  if (sentAmount !== null) {
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="text-xl font-bold">{formatCurrency(sentAmount)} sent</h2>
        <p className="text-muted-foreground">
          This payment fits your usual activity, so no extra steps were needed.
        </p>
        <button
          onClick={onDone}
          className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <button
        onClick={() => {
          setRail(preset.rail);
          setAmount(String(preset.amount));
          setRecipientName(preset.recipientName);
          setRecipientIsNew(preset.recipientIsNew);
        }}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10"
      >
        <Sparkles className="size-4" />
        Fill demo payment: {formatCurrency(preset.amount)} {preset.rail.toLowerCase()} to {preset.recipientName}
      </button>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Payment type</label>
          <div className="grid grid-cols-2 gap-2">
            {RAILS.map((r) => (
              <button
                key={r}
                onClick={() => setRail(r)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${
                  rail === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="recipient">
            Recipient
          </label>
          <input
            id="recipient"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Name or business"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={recipientIsNew} onChange={(e) => setRecipientIsNew(e.target.checked)} />
            New recipient (not a saved payee)
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ rail, amount: amountNum, recipientName: recipientName.trim(), recipientIsNew })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {checking && <Loader2 className="size-4 animate-spin" />}
          {checking ? "Checking payment…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
