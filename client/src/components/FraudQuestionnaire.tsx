import { useState } from "react";
import {
  ShieldAlert,
  Phone,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { formatCurrency } from "@/lib/data";
import type { PaymentSignals } from "@/lib/payment";
import type { Reason } from "@/lib/api";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** HIGH tier runs every step; MEDIUM runs a short check (purpose, pressure, independent check). */
const STEPS: Record<"full" | "short", Step[]> = {
  full: [1, 2, 3, 4, 5, 6, 7],
  short: [1, 2, 4, 5],
};

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
  trustedContactName: string;
  trustedContactPhone: string;
  freeText: string;
}

const INITIAL_ANSWERS: Answers = {
  purpose: "",
  contactType: "",
  relationship: "",
  metInPerson: "",
  sentBefore: "",
  howContacted: "",
  actQuickly: "",
  keepPrivate: "",
  toldWhatToSay: "",
  storyChanged: "",
  calledDirectly: "",
  moneySetAside: "",
  impactIfLost: "",
  hasPlan: "",
  trustedContactName: "",
  trustedContactPhone: "",
  freeText: "",
};

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border-2 px-5 py-3.5 text-left text-base font-medium transition-all ${
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function TalkToPersonButton() {
  return (
    <button className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
      <Phone className="size-4" />
      Talk to a person
    </button>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < step ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function LanguageBar() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Globe className="size-3.5" />
      <button className="font-medium text-primary hover:underline">
        Español
      </button>
      <span>·</span>
      <button className="font-medium text-primary hover:underline">
        中文
      </button>
      <span>·</span>
      <button className="font-medium text-primary hover:underline">
        Tiếng Việt
      </button>
      <span className="ml-1">·</span>
      <button className="font-medium text-primary hover:underline">
        Read aloud
      </button>
    </div>
  );
}

export function FraudQuestionnaire({
  payment,
  reasons,
  mode,
  existingContactName,
  onSubmit,
  onCancel,
}: {
  payment: PaymentSignals;
  reasons: Reason[];
  mode: "full" | "short";
  existingContactName: string | null;
  onSubmit: (answers: Answers) => void;
  onCancel: () => void;
}) {
  const steps = STEPS[mode];
  const [idx, setIdx] = useState(0);
  const step = steps[idx];
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [holdingPayment, setHoldingPayment] = useState(false);

  const set = <K extends keyof Answers>(key: K, val: Answers[K]) =>
    setAnswers((a) => ({ ...a, [key]: val }));

  const next = () => {
    if (idx === steps.length - 1) onSubmit(answers);
    else setIdx(idx + 1);
  };
  const prev = () => (idx === 0 ? onCancel() : setIdx(idx - 1));
  const familyStory = answers.purpose === "family-emergency" || answers.purpose === "legal-fees";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <LanguageBar />
        <TalkToPersonButton />
      </div>

      <ProgressBar step={idx + 1} total={steps.length} />

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-400/50 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-950/30">
            <ShieldAlert className="mt-0.5 size-8 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
                Why we're pausing
              </h2>
              <p className="text-lg leading-relaxed text-amber-800 dark:text-amber-300">
                This {formatCurrency(payment.amount)}{" "}
                {payment.rail.toLowerCase()} to{" "}
                <strong>{payment.recipientName}</strong> is different from your
                usual activity:
              </p>
              <ul className="list-disc space-y-1 pl-6 text-lg text-amber-800 dark:text-amber-300">
                {reasons.map((r) => (
                  <li key={r.code}>{r.label}</li>
                ))}
              </ul>
              <p className="text-lg leading-relaxed text-amber-800 dark:text-amber-300">
                We'd like to ask a few questions to help protect you. It takes
                about <strong>{mode === "full" ? "4 minutes" : "1 minute"}</strong>.
                You make the final decision.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Sound Credit Union is required to help protect members from fraud.
            Your answers stay private.
          </p>
          <button
            onClick={next}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">What is this money for?</h2>
          <div className="space-y-3">
            {[
              { value: "family-emergency", label: "Family emergency" },
              { value: "legal-fees", label: "Bail or legal fees" },
              { value: "investment", label: "An investment" },
              { value: "purchase", label: "A purchase" },
              { value: "bill", label: "A bill" },
              { value: "gift", label: "A gift" },
              { value: "other", label: "Other" },
            ].map((opt) => (
              <OptionButton
                key={opt.value}
                selected={answers.purpose === opt.value}
                onClick={() => set("purpose", opt.value)}
              >
                {opt.label}
              </OptionButton>
            ))}
          </div>

          {(answers.purpose === "family-emergency" ||
            answers.purpose === "legal-fees") && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
              <p className="text-base font-medium">
                Is the person in trouble asking you directly, or is someone else
                asking for them — such as a lawyer, police officer, or bail
                agent?
              </p>
              <div className="space-y-3">
                <OptionButton
                  selected={answers.contactType === "directly"}
                  onClick={() => set("contactType", "directly")}
                >
                  They're asking me directly
                </OptionButton>
                <OptionButton
                  selected={answers.contactType === "someone-else"}
                  onClick={() => set("contactType", "someone-else")}
                >
                  Someone else is asking on their behalf
                </OptionButton>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-base font-medium" htmlFor="freeText">
              In your own words, what is this payment for? (optional)
            </label>
            <textarea
              id="freeText"
              rows={3}
              value={answers.freeText}
              onChange={(e) => set("freeText", e.target.value)}
              placeholder="e.g. My grandson's lawyer says he needs bail tonight"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              onClick={next}
              disabled={!answers.purpose}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              Continue
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">About the recipient</h2>

          <div className="space-y-4">
            <p className="text-base font-medium">
              What is your relationship to the person receiving the money?
            </p>
            <div className="space-y-3">
              {[
                { value: "family", label: "Family member" },
                { value: "friend", label: "Friend" },
                { value: "professional", label: "Lawyer / professional" },
                { value: "stranger", label: "Someone I don't know well" },
              ].map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={answers.relationship === opt.value}
                  onClick={() => set("relationship", opt.value)}
                >
                  {opt.label}
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-base font-medium">
              Have you met this person in real life?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <OptionButton
                selected={answers.metInPerson === "yes"}
                onClick={() => set("metInPerson", "yes")}
              >
                Yes
              </OptionButton>
              <OptionButton
                selected={answers.metInPerson === "no"}
                onClick={() => set("metInPerson", "no")}
              >
                No
              </OptionButton>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-base font-medium">
              Have you sent them money before?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <OptionButton
                selected={answers.sentBefore === "yes"}
                onClick={() => set("sentBefore", "yes")}
              >
                Yes
              </OptionButton>
              <OptionButton
                selected={answers.sentBefore === "no"}
                onClick={() => set("sentBefore", "no")}
              >
                No
              </OptionButton>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-base font-medium">
              How did they first contact you about this?
            </p>
            <div className="space-y-3">
              {[
                { value: "phone", label: "Phone call" },
                { value: "text", label: "Text message" },
                { value: "email", label: "Email" },
                { value: "social", label: "Social media" },
                { value: "in-person", label: "In person" },
              ].map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={answers.howContacted === opt.value}
                  onClick={() => set("howContacted", opt.value)}
                >
                  {opt.label}
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Pressure and secrecy</h2>
          <p className="text-sm text-muted-foreground">
            These questions help us spot common scam patterns. There are no
            wrong answers.
          </p>

          {[
            {
              key: "actQuickly" as const,
              q: "Were you told to act quickly or by a deadline?",
            },
            {
              key: "keepPrivate" as const,
              q: "Were you asked to keep this private, even from family?",
            },
            {
              key: "toldWhatToSay" as const,
              q: "Were you told what to say if Sound Credit Union asked questions?",
            },
            {
              key: "storyChanged" as const,
              q: "Has the story changed since the first call?",
            },
          ].map(({ key, q }) => (
            <div key={key} className="space-y-3">
              <p className="text-base font-medium">{q}</p>
              <div className="grid grid-cols-2 gap-3">
                <OptionButton
                  selected={answers[key] === "yes"}
                  onClick={() => set(key, "yes")}
                >
                  Yes
                </OptionButton>
                <OptionButton
                  selected={answers[key] === "no"}
                  onClick={() => set(key, "no")}
                >
                  No
                </OptionButton>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Independent check</h2>

          <div className="rounded-2xl border-2 border-blue-400/50 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-950/30">
            <p className="text-lg leading-relaxed text-blue-900 dark:text-blue-200">
              {familyStory
                ? "Have you called your family member on a phone number "
                : "Have you confirmed the payment details by calling the recipient on a number "}
              <strong>you already had</strong> — not one the caller gave you?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <OptionButton
              selected={answers.calledDirectly === "yes"}
              onClick={() => set("calledDirectly", "yes")}
            >
              Yes, I called them myself
            </OptionButton>
            <OptionButton
              selected={answers.calledDirectly === "no"}
              onClick={() => set("calledDirectly", "no")}
            >
              No, not yet
            </OptionButton>
          </div>

          {answers.calledDirectly === "no" && !holdingPayment && (
            <button
              onClick={() => setHoldingPayment(true)}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-blue-500 bg-blue-500 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-600"
            >
              <Phone className="size-5" />
              Call now — we'll save your payment
            </button>
          )}

          {holdingPayment && (
            <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-400/50 bg-emerald-50 px-5 py-4 dark:border-emerald-500/30 dark:bg-emerald-950/30">
              <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Your payment is on hold
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Take your time. Make the call, then come back here.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Impact</h2>

          <div className="space-y-4">
            <p className="text-base font-medium">
              Was this money set aside for something else, like bills, medical
              costs, or savings?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <OptionButton
                selected={answers.moneySetAside === "yes"}
                onClick={() => set("moneySetAside", "yes")}
              >
                Yes
              </OptionButton>
              <OptionButton
                selected={answers.moneySetAside === "no"}
                onClick={() => set("moneySetAside", "no")}
              >
                No
              </OptionButton>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-base font-medium">
              If the money couldn't be recovered, how would it affect you?
            </p>
            <div className="space-y-3">
              {[
                { value: "severe", label: "It would be very difficult" },
                { value: "moderate", label: "I'd manage, but it would hurt" },
                { value: "minor", label: "It wouldn't be a major problem" },
              ].map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={answers.impactIfLost === opt.value}
                  onClick={() => set("impactIfLost", opt.value)}
                >
                  {opt.label}
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-base font-medium">
              Do you have a plan if the money isn't recovered?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <OptionButton
                selected={answers.hasPlan === "yes"}
                onClick={() => set("hasPlan", "yes")}
              >
                Yes
              </OptionButton>
              <OptionButton
                selected={answers.hasPlan === "no"}
                onClick={() => set("hasPlan", "no")}
              >
                No
              </OptionButton>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Support</h2>

          <div className="rounded-2xl border border-border bg-muted/30 p-6 space-y-4">
            <p className="text-base leading-relaxed">
              Who would you like us to contact if something seems wrong? This
              person will be <strong>informed, never given control</strong> of
              your account.
            </p>
            {existingContactName ? (
              <p className="text-sm font-medium text-emerald-700">
                {existingContactName} is your trusted contact.
              </p>
            ) : (
            <>
            <p className="text-sm text-muted-foreground">
              This is optional. You can add or remove a trusted contact at any
              time.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Contact name (optional)"
                value={answers.trustedContactName}
                onChange={(e) => set("trustedContactName", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={answers.trustedContactPhone}
                onChange={(e) => set("trustedContactPhone", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              See my risk score
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
