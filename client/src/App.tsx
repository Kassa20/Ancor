import { useState } from "react";
import { Layout, type View } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { TransactionList } from "@/components/TransactionList";
import {
  TrustedContactPage,
  type TrustedContactInfo,
} from "@/components/TrustedContact";
import { FraudQuestionnaire } from "@/components/FraudQuestionnaire";
import { getMemberEvents } from "@/lib/data";

const MEMBER_ID = "M1001";
const MEMBER_NAME = "Linda";

const memberEvents = getMemberEvents(MEMBER_ID);

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [trustedContact, setTrustedContact] =
    useState<TrustedContactInfo | null>(null);
  const [paymentDecision, setPaymentDecision] = useState<string | null>(null);

  return (
    <Layout
      currentView={view}
      onViewChange={setView}
      memberName={MEMBER_NAME}
    >
      {view === "dashboard" && (
        <Dashboard
          memberName={MEMBER_NAME}
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
          onSave={(c) => {
            setTrustedContact(c);
            setView("dashboard");
          }}
          onRemove={() => {
            setTrustedContact(null);
            setView("dashboard");
          }}
          onBack={() => setView("dashboard")}
        />
      )}
      {view === "send-money" && (
        <FraudQuestionnaire
          onComplete={(decision) => {
            setPaymentDecision(decision);
            setView("dashboard");
          }}
          onCancel={() => setView("dashboard")}
        />
      )}
    </Layout>
  );
}

export default App;
