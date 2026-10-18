import { useEffect, useMemo, useState } from "react";
import { Layout, type View } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { TransactionList } from "@/components/TransactionList";
import {
  TrustedContactPage,
  type TrustedContactInfo,
} from "@/components/TrustedContact";
import { FraudQuestionnaire, type Answers } from "@/components/FraudQuestionnaire";
import { SendMoney } from "@/components/SendMoney";
import { RiskResult } from "@/components/RiskResult";
import { TakeoverConsole } from "@/components/TakeoverConsole";
import { AccountProtected } from "@/components/AccountProtected";
import { getMemberEvents } from "@/lib/data";
import {
  DEMO_MEMBERS,
  buildPaymentSignals,
  type PaymentDraft,
  type PaymentSignals,
} from "@/lib/payment";
import {
  api,
  type Lockdown,
  type PrecheckResult,
  type RiskScoreResult,
  type TrustedContactRecord,
} from "@/lib/api";

const toContactInfo = (r: TrustedContactRecord): TrustedContactInfo => ({
  id: r.id,
  name: r.name,
  relationship: r.relationship,
  phone: r.phone ?? "",
  email: r.email ?? "",
  autoAlert: r.auto_alert,
});

function App() {
  const [memberId, setMemberId] = useState(DEMO_MEMBERS[0].id);
  const member = DEMO_MEMBERS.find((m) => m.id === memberId)!;
  const memberEvents = useMemo(() => getMemberEvents(memberId), [memberId]);

  const [view, setView] = useState<View>("dashboard");
  const [trustedContact, setTrustedContact] =
    useState<TrustedContactInfo | null>(null);
  const [lockdown, setLockdown] = useState<Lockdown | null>(null);
  const sendingPaused = lockdown?.status === "awaiting_reverification";

  // Payment check flow: draft → precheck → questionnaire → AI score → decision.
  const [payment, setPayment] = useState<PaymentSignals | null>(null);
  const [precheck, setPrecheck] = useState<PrecheckResult | null>(null);
  const [scoreResult, setScoreResult] = useState<RiskScoreResult | null>(null);
  const [sentAmount, setSentAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listTrustedContacts(memberId)
      .then((rows) => setTrustedContact(rows[0] ? toContactInfo(rows[0]) : null))
      .catch((e: Error) => console.error("Could not load trusted contacts:", e.message));
    setLockdown(null);
    api
      .getMemberLockdown(memberId)
      .then(setLockdown)
      .catch((e: Error) => console.error("Could not load lockdown:", e.message));
  }, [memberId]);

  const resetFlow = () => {
    setPayment(null);
    setPrecheck(null);
    setScoreResult(null);
    setSentAmount(null);
    setError(null);
  };

  const goHome = () => {
    resetFlow();
    setView("dashboard");
  };

  const saveContact = async (c: TrustedContactInfo) => {
    if (trustedContact?.id) await api.removeTrustedContact(trustedContact.id);
    const saved = await api.addTrustedContact(memberId, c);
    setTrustedContact(toContactInfo(saved));
  };

  const startPayment = async (draft: PaymentDraft) => {
    setBusy(true);
    setError(null);
    try {
      const signals = buildPaymentSignals(memberEvents, draft, member.now);
      const check = await api.precheck(signals);
      setPayment(signals);
      setPrecheck(check);
      if (check.tier === "LOW") setSentAmount(draft.amount);
      else setView("questionnaire");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswers = async (answers: Answers) => {
    if (!payment) return;
    setBusy(true);
    setError(null);
    setView("risk-result");
    try {
      // A contact added during the questionnaire is enrolled before scoring, so a HIGH score can alert them.
      if (!trustedContact && answers.trustedContactName.trim() && answers.trustedContactPhone.trim()) {
        await saveContact({
          name: answers.trustedContactName.trim(),
          relationship: "Other Family Member",
          phone: answers.trustedContactPhone.trim(),
          email: "",
          autoAlert: true,
        }).catch((e: Error) => console.error("Could not save trusted contact:", e.message));
      }
      setScoreResult(
        await api.score({ memberId, memberFirstName: member.firstName, payment, answers }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const memberSwitcher = (
    <select
      value={memberId}
      onChange={(e) => {
        setMemberId(e.target.value);
        goHome();
      }}
      className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
      aria-label="Demo member"
    >
      {DEMO_MEMBERS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label} ({m.id})
        </option>
      ))}
    </select>
  );

  return (
    <Layout
      currentView={view}
      onViewChange={(v) => {
        resetFlow();
        setView(v);
      }}
      memberName={member.firstName}
      headerExtra={memberSwitcher}
    >
      {view === "dashboard" && lockdown && (
        <div className="mb-6">
          <AccountProtected lockdown={lockdown} />
        </div>
      )}
      {view === "dashboard" && (
        <Dashboard
          memberName={member.firstName}
          events={memberEvents}
          onViewTransactions={() => setView("transactions")}
          trustedContact={trustedContact}
          onSetupTrustedContact={() => setView("trusted-contact")}
          onSendMoney={() => setView("send-money")}
        />
      )}
      {view === "transactions" && (
        <TransactionList events={memberEvents} title="All Transactions" />
      )}
      {view === "trusted-contact" && (
        <TrustedContactPage
          contact={trustedContact}
          onSave={async (c) => {
            await saveContact(c).catch((e: Error) => alert(`Could not save: ${e.message}`));
            setView("dashboard");
          }}
          onRemove={async () => {
            if (trustedContact?.id) await api.removeTrustedContact(trustedContact.id).catch(console.error);
            setTrustedContact(null);
            setView("dashboard");
          }}
          onBack={() => setView("dashboard")}
        />
      )}
      {view === "send-money" && sendingPaused && (
        <div className="mx-auto max-w-lg">
          <AccountProtected lockdown={lockdown!} />
        </div>
      )}
      {view === "send-money" && !sendingPaused && (
        <SendMoney
          key={memberId}
          preset={member.preset}
          sentAmount={sentAmount}
          checking={busy}
          error={error}
          onSubmit={startPayment}
          onDone={goHome}
        />
      )}
      {view === "fraud-console" &&
        (member.module === "takeover-lockdown" ? (
          <TakeoverConsole
            memberId={memberId}
            memberName={member.firstName}
            events={memberEvents}
            now={member.now}
            lockdown={lockdown}
            onLockdownChange={setLockdown}
          />
        ) : (
          <p className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            No takeover signals for {member.firstName}. Switch to Sarah (M1003) to see the takeover lockdown.
          </p>
        ))}
      {view === "questionnaire" && payment && precheck && (
        <FraudQuestionnaire
          payment={payment}
          reasons={precheck.reasons}
          mode={precheck.tier === "HIGH" ? "full" : "short"}
          existingContactName={trustedContact?.name ?? null}
          onSubmit={submitAnswers}
          onCancel={goHome}
        />
      )}
      {view === "risk-result" && payment && (
        scoreResult ? (
          <RiskResult
            memberId={memberId}
            memberFirstName={member.firstName}
            payment={payment}
            result={scoreResult}
            hasTrustedContact={!!trustedContact}
            onAddTrustedContact={() => setView("trusted-contact")}
            onFinish={goHome}
          />
        ) : (
          <div className="mx-auto max-w-2xl py-16 text-center text-muted-foreground">
            {busy ? "Checking your answers…" : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
                <p className="font-semibold">We couldn't check this payment right now.</p>
                <p className="mt-1 text-sm">{error}</p>
                <p className="mt-3 text-sm">Your payment is on hold. Please call Sound or try again.</p>
              </div>
            )}
          </div>
        )
      )}
    </Layout>
  );
}

export default App;
