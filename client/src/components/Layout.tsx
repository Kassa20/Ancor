import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  Landmark,
  Bell,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";

export type View = "dashboard" | "transactions" | "trusted-contact" | "send-money";

interface LayoutProps {
  currentView: View;
  onViewChange: (view: View) => void;
  memberName: string;
  children: React.ReactNode;
}

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="size-5" />,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: <ArrowLeftRight className="size-5" />,
  },
  {
    id: "trusted-contact",
    label: "Trusted Contact",
    icon: <ShieldCheck className="size-5" />,
  },
];

export function Layout({
  currentView,
  onViewChange,
  memberName,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-secondary/50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <Landmark className="size-7 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Sound Credit Union
            </span>
            <span className="text-xs text-muted-foreground">Online Banking</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-1 hover:bg-muted lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onViewChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    currentView === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {memberName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{memberName}</p>
              <p className="text-xs text-muted-foreground">Member</p>
            </div>
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-lg font-semibold">
            {currentView === "send-money"
              ? "Send Money"
              : (navItems.find((n) => n.id === currentView)?.label ?? "Dashboard")}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
