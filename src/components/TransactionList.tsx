import {
  CreditCard,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Clock,
  UserPlus,
  ShieldAlert,
  PhoneCall,
  FileText,
  CircleDollarSign,
  LogIn,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  HandCoins,
} from "lucide-react";
import type { Event } from "@/lib/data";
import {
  parseAmount,
  formatCurrency,
  formatTime,
  getEventLabel,
  groupEventsByDate,
} from "@/lib/data";

function getEventIcon(event: Event) {
  const iconClass = "size-4";
  switch (event.event_type) {
    case "Debit Purchase":
      return <CreditCard className={iconClass} />;
    case "Bill Payment":
    case "Automatic Payment":
      return <Receipt className={iconClass} />;
    case "Deposit":
      return <ArrowDownLeft className={iconClass} />;
    case "ATM Withdrawal":
      return <Banknote className={iconClass} />;
    case "Login":
      return <LogIn className={iconClass} />;
    case "Branch Visit":
      return <Building2 className={iconClass} />;
    case "Payment Initiated":
      return <ArrowUpRight className={iconClass} />;
    case "Payment Held":
      return <Clock className={iconClass} />;
    case "Payment Released":
    case "Payment Completed":
      return <CheckCircle2 className={iconClass} />;
    case "Payment Cancelled":
      return <XCircle className={iconClass} />;
    case "Recipient Added":
      return <UserPlus className={iconClass} />;
    case "Confirmation Requested":
      return <ShieldAlert className={iconClass} />;
    case "Employee Outreach":
    case "Employee Escalation":
      return <PhoneCall className={iconClass} />;
    case "Trusted Contact Offered":
      return <HandCoins className={iconClass} />;
    case "Scam Reported":
    case "Case Created":
      return <FileText className={iconClass} />;
    case "Recovery Request":
    case "Recovery Unsuccessful":
      return <CircleDollarSign className={iconClass} />;
    default:
      return <AlertTriangle className={iconClass} />;
  }
}

function getIconBg(event: Event): string {
  if (event.transaction_direction === "Incoming") return "bg-emerald-50 text-emerald-600";
  if (
    event.event_category === "Intervention" ||
    event.event_category === "Case & Recovery"
  )
    return "bg-amber-50 text-amber-600";
  if (event.payment_status === "Cancelled by Member") return "bg-red-50 text-red-500";
  if (event.payment_status === "Held") return "bg-amber-50 text-amber-600";
  if (event.event_category === "Authentication") return "bg-slate-50 text-slate-400";
  return "bg-primary/5 text-primary";
}

function TransactionRow({ event }: { event: Event }) {
  const amount = parseAmount(event.amount);
  const isIncoming = event.transaction_direction === "Incoming";
  const isNonMonetary =
    event.event_category === "Authentication" ||
    event.event_category === "Interaction" ||
    event.event_category === "Recipient" ||
    event.event_category === "Intervention" ||
    event.event_category === "Trusted Contact" ||
    event.event_category === "Case & Recovery";

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${getIconBg(event)}`}
      >
        {getEventIcon(event)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{getEventLabel(event)}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatTime(event.event_timestamp)}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{event.channel}</span>
          {event.payment_rail !== "Not Applicable" && event.payment_rail && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {event.payment_rail}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {!isNonMonetary && amount > 0 ? (
          <span
            className={`text-sm font-semibold tabular-nums ${
              isIncoming ? "text-emerald-600" : "text-foreground"
            }`}
          >
            {isIncoming ? "+" : "-"}
            {formatCurrency(amount)}
          </span>
        ) : event.payment_status && event.payment_status !== "Not Applicable" ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              event.payment_status === "Held"
                ? "bg-amber-50 text-amber-700"
                : event.payment_status === "Cancelled by Member"
                  ? "bg-red-50 text-red-600"
                  : event.payment_status === "Completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
            }`}
          >
            {event.payment_status}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface TransactionListProps {
  events: Event[];
  limit?: number;
  title?: string;
}

export function TransactionList({ events, limit, title }: TransactionListProps) {
  const moneyAndActivityEvents = events;
  const displayEvents = limit
    ? moneyAndActivityEvents.slice(-limit).reverse()
    : [...moneyAndActivityEvents].reverse();
  const grouped = groupEventsByDate(displayEvents);

  return (
    <div className="rounded-xl border border-border bg-card">
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-border">
        {grouped.map((group) => (
          <div key={group.date}>
            <div className="sticky top-0 z-10 bg-secondary/80 px-4 py-2 backdrop-blur-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {group.date}
              </span>
            </div>
            <div className="px-1">
              {group.events.map((event) => (
                <TransactionRow key={event.event_id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
