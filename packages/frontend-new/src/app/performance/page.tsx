"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskMetrics, usePortfolio } from "@/lib/api";
import { TrendingUp, TrendingDown, Target, BarChart3, DollarSign, Percent } from "lucide-react";

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

export default function PerformancePage() {
  const { data: risk, isLoading: riskLoading } = useRiskMetrics();
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();

  const isLoading = riskLoading || portfolioLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground">Track your trading performance</p>
      </div>

      {/* P&L Summary */}
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
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${(risk?.dailyPnL || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(risk?.dailyPnL || 0)}
                </div>
                <p className={`text-xs ${(risk?.dailyPnLPercent || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatPercent(risk?.dailyPnLPercent || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${(portfolio?.account?.unrealizedPnL || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(portfolio?.account?.unrealizedPnL || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Open positions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${(portfolio?.account?.realizedPnL || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(portfolio?.account?.realizedPnL || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Closed trades</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio?.account?.netLiquidation || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Net liquidation</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trading Statistics</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Win Rate</p>
                      <p className="text-sm text-muted-foreground">Winning vs total trades</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {((risk?.winRate || 0) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Profit Factor</p>
                      <p className="text-sm text-muted-foreground">Gross profit / Gross loss</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {(risk?.profitFactor || 0).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Sharpe Ratio</p>
                      <p className="text-sm text-muted-foreground">Risk-adjusted return</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {(risk?.sharpeRatio || 0).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Percent className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Max Drawdown</p>
                      <p className="text-sm text-muted-foreground">Largest peak-to-trough</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red-500">
                    {formatPercent(-(risk?.maxDrawdown || 0))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>Current account status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : (
              <>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Net Liquidation</span>
                  <span className="font-medium">{formatCurrency(portfolio?.account?.netLiquidation || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Cash Balance</span>
                  <span className="font-medium">{formatCurrency(portfolio?.account?.totalCash || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Buying Power</span>
                  <span className="font-medium">{formatCurrency(portfolio?.account?.buyingPower || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Gross Position Value</span>
                  <span className="font-medium">{formatCurrency(portfolio?.account?.grossPositionValue || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Portfolio Heat</span>
                  <span className={`font-medium ${(risk?.portfolioHeat || 0) > 50 ? "text-yellow-500" : "text-green-500"}`}>
                    {(risk?.portfolioHeat || 0).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
