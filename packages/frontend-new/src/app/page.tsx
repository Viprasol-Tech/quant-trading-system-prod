"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePortfolio, useRiskMetrics, useSignals } from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function DashboardPage() {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { data: risk, isLoading: riskLoading } = useRiskMetrics();
  const { data: signals, isLoading: signalsLoading } = useSignals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your trading portfolio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Liquidation</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio?.account?.netLiquidation || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Buying Power: {formatCurrency(portfolio?.account?.buyingPower || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

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
            {riskLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Heat</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(risk?.portfolioHeat || 0).toFixed(1)}%
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (risk?.portfolioHeat || 0) > 80
                        ? "bg-red-500"
                        : (risk?.portfolioHeat || 0) > 50
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(risk?.portfolioHeat || 0, 100)}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-500">
                  {formatPercent(-(risk?.maxDrawdown || 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: {formatPercent(-(risk?.currentDrawdown || 0))}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {((risk?.winRate || 0) * 100).toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {(risk?.profitFactor || 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {(risk?.sharpeRatio || 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Positions & Signals */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
            <CardDescription>Your current holdings</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : portfolio?.positions?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.positions.slice(0, 5).map((pos) => (
                    <TableRow key={pos.symbol}>
                      <TableCell className="font-medium">{pos.symbol}</TableCell>
                      <TableCell className="text-right">{pos.quantity}</TableCell>
                      <TableCell
                        className={`text-right ${
                          pos.unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatCurrency(pos.unrealizedPnL)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No open positions</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Signals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signals</CardTitle>
            <CardDescription>Latest strategy signals</CardDescription>
          </CardHeader>
          <CardContent>
            {signalsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : signals?.length ? (
              <div className="space-y-3">
                {signals.slice(0, 5).map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {signal.action === "BUY" ? (
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                      ) : signal.action === "SELL" ? (
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                      ) : (
                        <div className="h-5 w-5" />
                      )}
                      <div>
                        <p className="font-medium">{signal.symbol}</p>
                        <p className="text-xs text-muted-foreground">{signal.strategy}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          signal.action === "BUY"
                            ? "default"
                            : signal.action === "SELL"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {signal.action}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Strength: {(signal.strength * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No recent signals</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
