"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskMetrics, usePortfolio } from "@/lib/api";
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function RiskGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}

export default function RiskPage() {
  const { data: risk, isLoading: riskLoading, error: riskError } = useRiskMetrics();
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();

  if (riskLoading || portfolioLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
          <p className="text-muted-foreground">Monitor portfolio risk</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (riskError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
          <p className="text-muted-foreground">Monitor portfolio risk</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Unable to fetch risk metrics</p>
            <p className="text-sm text-muted-foreground mt-1">Check backend connection</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-muted-foreground">Monitor and control portfolio risk</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            {(risk?.dailyPnL || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (risk?.dailyPnL || 0) >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(risk?.dailyPnL || 0)}
            </div>
            <p
              className={`text-xs ${
                (risk?.dailyPnLPercent || 0) >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatPercent(risk?.dailyPnLPercent || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatPercent(-(risk?.maxDrawdown || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {formatPercent(-(risk?.currentDrawdown || 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((risk?.winRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Historical average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(risk?.sharpeRatio || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted return
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Gauges */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Heat</CardTitle>
            <CardDescription>Current risk exposure as % of account</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskGauge
              value={risk?.portfolioHeat || 0}
              max={100}
              label="Risk Exposure"
              color={
                (risk?.portfolioHeat || 0) > 80
                  ? "bg-red-500"
                  : (risk?.portfolioHeat || 0) > 50
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drawdown</CardTitle>
            <CardDescription>Current drawdown from peak equity</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskGauge
              value={risk?.currentDrawdown || 0}
              max={risk?.maxDrawdown || 20}
              label="Current DD"
              color={
                (risk?.currentDrawdown || 0) > 15
                  ? "bg-red-500"
                  : (risk?.currentDrawdown || 0) > 8
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Detailed risk and performance statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Profit Factor</div>
              <div className="text-2xl font-bold mt-1">
                {(risk?.profitFactor || 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Gross profit / Gross loss
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold mt-1">
                {((risk?.winRate || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Winning trades / Total trades
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
              <div className="text-2xl font-bold mt-1">
                {(risk?.sharpeRatio || 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Return / Volatility (annualized)
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Account Value</div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(portfolio?.account?.netLiquidation || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Net liquidation value
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
