"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Shield,
  Briefcase,
  ClipboardList,
  TrendingUp,
  History,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Market Data", href: "/market", icon: LineChart },
  { title: "Strategies", href: "/strategies", icon: Zap },
  { title: "Backtesting", href: "/backtest", icon: History },
];

const tradingNav = [
  { title: "Positions", href: "/positions", icon: Briefcase },
  { title: "Orders", href: "/orders", icon: ClipboardList },
  { title: "Risk", href: "/risk", icon: Shield },
  { title: "Performance", href: "/performance", icon: TrendingUp },
];

const systemNav = [
  { title: "Settings", href: "/settings", icon: Settings },
];

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.title}</span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            Q
          </div>
          <div>
            <h1 className="font-semibold text-sm">Quant Trading</h1>
            <p className="text-xs text-muted-foreground">IBKR Connected</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-4 space-y-6">
        <div>
          <h2 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Overview
          </h2>
          <div className="space-y-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Trading
          </h2>
          <div className="space-y-1">
            {tradingNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System
          </h2>
          <div className="space-y-1">
            {systemNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">Version 1.0.0</div>
      </div>
    </aside>
  );
}
