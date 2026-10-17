import {
  Eye,
  EyeOff,
  Send,
  Receipt,
  ArrowLeftRight,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import type { Event } from "@/lib/data";
import {
  formatCurrency,
  getLatestBalance,
  getMoneyMovementEvents,
  parseAmount,
} from "@/lib/data";
import { TransactionList } from "./TransactionList";
import {
  TrustedContactCard,
  type TrustedContactInfo,
} from "./TrustedContact";

interface DashboardProps {
  memberName: string;
  events: Event[];
  onViewTransactions: () => void;
  trustedContact: TrustedContactInfo | null;
  onSetupTrustedContact: () => void;
  onSendMoney: () => void;
}

function getSpendingThisMonth(events: Event[]): number {
  const movements = getMoneyMovementEvents(events);
  const now = new Date("2026-10-30");
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return movements
    .filter((e) => {
      const d = new Date(e.event_timestamp);
      return (
        d >= monthStart &&
        d <= now &&
        e.transaction_direction === "Outgoing" &&
        e.payment_status === "Completed"
      );
    })
    .reduce((sum, e) => sum + parseAmount(e.amount), 0);
}

function getIncomeThisMonth(events: Event[]): number {
  const movements = getMoneyMovementEvents(events);
  const now = new Date("2026-10-30");
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return movements
    .filter((e) => {
      const d = new Date(e.event_timestamp);
      return (
        d >= monthStart &&
        d <= now &&
        e.transaction_direction === "Incoming" &&
        e.payment_status === "Completed"
      );
    })
    .reduce((sum, e) => sum + parseAmount(e.amount), 0);
}

export function Dashboard({
  memberName,
  events,
  onViewTransactions,
  trustedContact,
  onSetupTrustedContact,
  onSendMoney,
}: DashboardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const balance = getLatestBalance(events);
  const spending = getSpendingThisMonth(events);
  const income = getIncomeThisMonth(events);

  const firstName = memberName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Welcome back, {firstName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here's your account overview
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Checking Account •••4821
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {balanceVisible ? formatCurrency(balance) : "••••••"}
              </span>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {balanceVisible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Available balance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          onClick={onSendMoney}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send className="size-4" />
          </div>
          <span className="text-sm font-medium">Send Money</span>
        </button>
        <button className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="size-4" />
          </div>
          <span className="text-sm font-medium">Pay Bills</span>
        </button>
        <button className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowLeftRight className="size-4" />
          </div>
          <span className="text-sm font-medium">Transfer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Spent this month
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums">
            {formatCurrency(spending)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Income this month
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-emerald-600">
            {formatCurrency(income)}
          </p>
        </div>
      </div>

      <TrustedContactCard
        contact={trustedContact}
        onSetup={onSetupTrustedContact}
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Recent Activity</h3>
          <button
            onClick={onViewTransactions}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </button>
        </div>
        <TransactionList events={events} limit={15} />
      </div>
    </div>
  );
}
