import { CheckCircle2, Circle } from "lucide-react";
import type { LockdownStep } from "@/lib/api";

export function LockdownSteps({ steps, showDetail }: { steps: LockdownStep[]; showDetail: boolean }) {
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.step_key} className="flex gap-3">
          {s.status === "done" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          ) : (
            <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className={`font-medium ${s.status === "done" ? "" : "text-muted-foreground"}`}>
              {s.step_order}. {s.label}
            </p>
            {showDetail && s.detail && <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
