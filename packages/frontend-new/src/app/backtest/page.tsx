"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStrategies,
  useRunBacktest,
  useBacktestHistory,
  BacktestResult,
  BacktestConfig,
} from "@/lib/api";
import {
  Play,
  History,
  BarChart3,
  DollarSign,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";

// Available symbols for backtesting (using Polygon/Massive API)
const SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
  "SPY",
  "QQQ",
  "IWM",
  "GLD",
  "SLV",
  "TLT",
  "XLF",
  "XLE",
  "XLK",
  "XLV",
  "VXX",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "BTCUSD",
  "ETHUSD",
];

// Strategy definitions
const STRATEGIES = [
  {
    id: "strategy-1-momentum",
    name: "Strategy 1: Momentum",
    description: "RSI + MACD momentum-based entries",
    type: "momentum",
    parameters: {
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
    },
  },
  {
    id: "strategy-2-mean-reversion",
    name: "Strategy 2: Mean Reversion",
    description: "Bollinger Bands mean reversion",
    type: "meanReversion",
    parameters: {
      bbPeriod: 20,
      bbStdDev: 2,
      rsiConfirm: true,
      rsiPeriod: 14,
    },
  },
  {
    id: "strategy-3-hybrid",
    name: "Strategy 3: Hybrid",
    description: "Combined momentum + mean reversion",
    type: "hybrid",
    parameters: {
      momentumWeight: 0.6,
      reversionWeight: 0.4,
      confirmationRequired: true,
    },
  },
  {
    id: "strategy-4-breakout",
    name: "Strategy 4: Breakout",
    description: "Donchian channel breakouts",
    type: "breakout",
    parameters: {
      period: 20,
      atrMultiplier: 2,
      volumeConfirm: true,
    },
  },
  {
    id: "strategy-5-scalping",
    name: "Strategy 5: Scalping",
    description: "Short-term scalping with tight stops",
    type: "scalping",
    parameters: {
      timeframe: "5m",
      maxHoldingPeriod: 30,
      targetPercent: 0.5,
      stopPercent: 0.25,
    },
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [activeResult, setActiveResult] = useState<BacktestResult | null>(null);

  const { data: strategies } = useStrategies();
  const { data: history, isLoading: historyLoading } = useBacktestHistory();
  const runBacktest = useRunBacktest();

  const handleRunBacktest = () => {
    if (!selectedStrategy || !selectedSymbol) return;

    const config: BacktestConfig = {
      strategyId: selectedStrategy,
      symbol: selectedSymbol,
      startDate,
      endDate,
      initialCapital,
    };

    runBacktest.mutate(config, {
      onSuccess: (result) => {
        setActiveResult(result);
      },
    });
  };

  const allStrategies = strategies?.length ? strategies : STRATEGIES;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backtesting</h1>
        <p className="text-muted-foreground">
          Test strategies against historical data (Polygon/Massive API)
        </p>
      </div>

      <Tabs defaultValue="run" className="space-y-4">
        <TabsList>
          <TabsTrigger value="run" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Run Backtest
          </TabsTrigger>
          <TabsTrigger value="strategies" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Strategies
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Run Backtest Tab */}
        <TabsContent value="run" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Set up your backtest parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select
                    value={selectedStrategy}
                    onValueChange={(v) => v && setSelectedStrategy(v)}
                  >
                    <SelectTrigger id="strategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStrategies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select
                    value={selectedSymbol}
                    onValueChange={(v) => v && setSelectedSymbol(v)}
                  >
                    <SelectTrigger id="symbol">
                      <SelectValue placeholder="Select symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYMBOLS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capital">Initial Capital ($)</Label>
                  <Input
                    id="capital"
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleRunBacktest}
                  disabled={
                    !selectedStrategy ||
                    !selectedSymbol ||
                    runBacktest.isPending
                  }
                >
                  {runBacktest.isPending ? (
                    <>Running...</>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Backtest
                    </>
                  )}
                </Button>

                {runBacktest.isError && (
                  <p className="text-sm text-red-500">
                    Error: {runBacktest.error?.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Results Panel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {activeResult
                    ? `${activeResult.strategyName} on ${activeResult.symbol}`
                    : "Run a backtest to see results"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {runBacktest.isPending ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                      ))}
                    </div>
                  </div>
                ) : activeResult ? (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <DollarSign className="h-4 w-4" />
                          Total Return
                        </div>
                        <div
                          className={`text-xl font-bold mt-1 ${
                            activeResult.totalReturn >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {formatCurrency(activeResult.totalReturn)}
                        </div>
                        <div
                          className={`text-sm ${
                            activeResult.totalReturnPercent >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {formatPercent(activeResult.totalReturnPercent)}
                        </div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Target className="h-4 w-4" />
                          Win Rate
                        </div>
                        <div className="text-xl font-bold mt-1">
                          {(activeResult.winRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {activeResult.totalTrades} trades
                        </div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <BarChart3 className="h-4 w-4" />
                          Profit Factor
                        </div>
                        <div className="text-xl font-bold mt-1">
                          {activeResult.profitFactor.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sharpe: {activeResult.sharpeRatio.toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          Max Drawdown
                        </div>
                        <div className="text-xl font-bold mt-1 text-red-500">
                          {formatPercent(-activeResult.maxDrawdown)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Peak to trough
                        </div>
                      </div>
                    </div>

                    {/* Equity Curve */}
                    {activeResult.equityCurve?.length > 0 && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activeResult.equityCurve}>
                            <defs>
                              <linearGradient
                                id="equityGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="hsl(var(--primary))"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="hsl(var(--primary))"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v) =>
                                new Date(v).toLocaleDateString("en-US", {
                                  month: "short",
                                })
                              }
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis
                              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area
                              type="monotone"
                              dataKey="equity"
                              stroke="hsl(var(--primary))"
                              fill="url(#equityGradient)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Trade List */}
                    {activeResult.trades?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">
                          Recent Trades ({activeResult.trades.length})
                        </h4>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Entry</TableHead>
                                <TableHead className="text-right">Exit</TableHead>
                                <TableHead className="text-right">P&L</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeResult.trades.slice(0, 10).map((trade, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">
                                    {formatDate(trade.entryDate)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        trade.action === "LONG"
                                          ? "default"
                                          : "destructive"
                                      }
                                    >
                                      {trade.action}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${trade.entryPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${trade.exitPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell
                                    className={`text-right font-medium ${
                                      trade.pnl >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {formatCurrency(trade.pnl)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium">No Results Yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure and run a backtest to see performance metrics
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STRATEGIES.map((strategy) => (
              <Card
                key={strategy.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedStrategy(strategy.id);
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <Badge variant="secondary">{strategy.type}</Badge>
                  </div>
                  <CardDescription>{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-muted-foreground">
                      Parameters:
                    </p>
                    {Object.entries(strategy.parameters)
                      .slice(0, 3)
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between text-muted-foreground"
                        >
                          <span>{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStrategy(strategy.id);
                    }}
                  >
                    Select for Backtest
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backtest History</CardTitle>
              <CardDescription>Previous backtest results</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : history?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-right">Win Rate</TableHead>
                      <TableHead className="text-right">Sharpe</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((result, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {result.strategyName}
                        </TableCell>
                        <TableCell>{result.symbol}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(result.startDate)} -{" "}
                          {formatDate(result.endDate)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            result.totalReturnPercent >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {formatPercent(result.totalReturnPercent)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(result.winRate * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {result.sharpeRatio.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveResult(result)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium">No History Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Run your first backtest to build history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
