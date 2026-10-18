import { ShieldCheck } from "lucide-react";
import type { Lockdown } from "@/lib/api";
import { LockdownSteps } from "./LockdownSteps";

/** Member view during and after a takeover lockdown. Plain language, no blame. */
export function AccountProtected({ lockdown }: { lockdown: Lockdown }) {
  const done = lockdown.status === "completed";
  return (
    <div className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-7 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold">
            {done ? "Your money is safe in your new account" : "We stopped unauthorized activity on your account"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {done
              ? `Your balance moved to ${lockdown.new_account_ref}. Your old account is closed, so whoever got your password can't use it.`
              : "Someone else signed in to your account. Sending money is paused while we confirm it's really you. This happens to careful people. You did the right thing."}
          </p>
        </div>
      </div>
      <LockdownSteps steps={lockdown.steps} showDetail={false} />
      {!done && (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-card p-3">
            <p className="mb-1 font-medium">Paused</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {lockdown.frozenActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-card p-3">
            <p className="mb-1 font-medium">Still working</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {lockdown.keepsWorking.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p className="text-sm">
        {done
          ? "A specialist will check in on day 3, 14 and 30."
          : "To finish, we'll call the phone number you had before the change, or you can visit any branch with photo ID."}
      </p>
    </div>
  );
}
