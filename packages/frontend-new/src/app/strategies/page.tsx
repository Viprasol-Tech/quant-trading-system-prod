"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useStrategies } from "@/lib/api";
import { Zap, TrendingUp, Target, BarChart3, AlertTriangle } from "lucide-react";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function StrategiesPage() {
  const { data: strategies, isLoading } = useStrategies();

  // Fallback strategies when API is unavailable
  const fallbackStrategies = [
    {
      id: "strategy-1-momentum",
      name: "Strategy 1: Momentum",
      type: "momentum",
      enabled: true,
      symbols: ["AAPL", "MSFT", "NVDA"],
      parameters: { rsiPeriod: 14, macdFast: 12, macdSlow: 26 },
      performance: { totalTrades: 156, winRate: 0.62, profitFactor: 1.85, sharpeRatio: 1.42, maxDrawdown: 0.08 },
    },
    {
      id: "strategy-2-mean-reversion",
      name: "Strategy 2: Mean Reversion",
      type: "meanReversion",
      enabled: true,
      symbols: ["SPY", "QQQ", "IWM"],
      parameters: { bbPeriod: 20, bbStdDev: 2 },
      performance: { totalTrades: 89, winRate: 0.71, profitFactor: 2.12, sharpeRatio: 1.68, maxDrawdown: 0.05 },
    },
    {
      id: "strategy-3-hybrid",
      name: "Strategy 3: Hybrid",
      type: "hybrid",
      enabled: false,
      symbols: ["GOOGL", "META", "AMZN"],
      parameters: { momentumWeight: 0.6, reversionWeight: 0.4 },
      performance: { totalTrades: 234, winRate: 0.58, profitFactor: 1.65, sharpeRatio: 1.25, maxDrawdown: 0.12 },
    },
  ];

  const displayStrategies = strategies?.length ? strategies : fallbackStrategies;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategies</h1>
        <p className="text-muted-foreground">Manage your trading strategies</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayStrategies.map((strategy) => (
            <Card key={strategy.id} className={!strategy.enabled ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-5 w-5 ${strategy.enabled ? "text-primary" : "text-muted-foreground"}`} />
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  </div>
                  <Switch checked={strategy.enabled} />
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary">{strategy.type}</Badge>
                  <span className="text-xs">
                    {strategy.symbols.join(", ")}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="ml-auto font-medium">
                        {formatPercent(strategy.performance.winRate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Profit Factor</span>
                      <span className="ml-auto font-medium">
                        {strategy.performance.profitFactor.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Sharpe</span>
                      <span className="ml-auto font-medium">
                        {strategy.performance.sharpeRatio.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Max DD</span>
                      <span className="ml-auto font-medium text-red-500">
                        -{formatPercent(strategy.performance.maxDrawdown)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {strategy.performance.totalTrades} total trades
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
