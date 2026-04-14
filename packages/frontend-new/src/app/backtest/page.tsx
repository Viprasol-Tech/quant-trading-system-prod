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
  Settings,
} from "lucide-react";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";

// All available symbols for backtesting
const ALL_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "SPY", "QQQ", "IWM",
  "XLF", "XLE", "XLK", "XLV",
  "GLD", "SLV",
  "TLT",
  "VXX",
  "EURUSD", "GBPUSD", "USDJPY",
  "BTCUSD", "ETHUSD",
];

// Real strategy parameters
const DEFAULT_PARAMS = {
  "strategy-1-momentum": {
    minConfidence: 60,
    rsiMin: 40,
    rsiMax: 70,
    rvolThreshold: 1.5,
    atrMultiplier: 2.5,
  },
  "strategy-2-mean-reversion": {
    minConfidence: 55,
    rsiMin: 35,
    rsiMax: 50,
    atrMultiplier: 2.0,
  },
  "strategy-3-hybrid": {
    minCompositeScore: 65,
    atrMultiplier: 2.5,
  },
};

// Strategy definitions with real parameters
const STRATEGIES = [
  {
    id: "strategy-1-momentum",
    name: "Strategy 1: Trend Breakout",
    description: "RSI + RVOL breakout detection",
    type: "momentum",
    defaultParams: DEFAULT_PARAMS["strategy-1-momentum"],
  },
  {
    id: "strategy-2-mean-reversion",
    name: "Strategy 2: Pullback Reversion",
    description: "RSI pullback mean reversion",
    type: "meanReversion",
    defaultParams: DEFAULT_PARAMS["strategy-2-mean-reversion"],
  },
  {
    id: "strategy-3-hybrid",
    name: "Strategy 3: Hybrid Composite",
    description: "Combined momentum + mean reversion",
    type: "hybrid",
    defaultParams: DEFAULT_PARAMS["strategy-3-hybrid"],
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

// Map snake_case API response to camelCase frontend types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHistoryRow(row: Record<string, any>): Partial<BacktestResult> {
  return {
    strategyId: row.strategy_id,
    strategyName: row.strategy_name,
    symbol: row.symbol,
    startDate: row.start_date,
    endDate: row.end_date,
    initialCapital: row.initial_capital,
    finalCapital: row.final_capital,
    totalReturn: row.total_return,
    totalReturnPercent: row.total_return_pct,
    maxDrawdown: row.max_drawdown,
    sharpeRatio: row.sharpe_ratio,
    winRate: row.win_rate,
    totalTrades: row.total_trades,
    profitFactor: row.profit_factor || 0,
    equityCurve: row.equity_curve,
    trades: row.trades,
  };
}

export default function BacktestPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState("run");

  // Configuration state
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

  // Strategy parameters state
  const [strategyParams, setStrategyParams] = useState<
    Record<string, Record<string, number>>
  >(DEFAULT_PARAMS);

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
      parameters: strategyParams[selectedStrategy],
    };

    runBacktest.mutate(config, {
      onSuccess: (result) => {
        setActiveResult(result);
        setActiveTab("run");
      },
    });
  };

  const handleSelectAndApplyStrategy = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    setActiveTab("run");
  };

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleResetStrategyParams = (strategyId: string) => {
    setStrategyParams({
      ...strategyParams,
      [strategyId]: DEFAULT_PARAMS[strategyId as keyof typeof DEFAULT_PARAMS],
    });
  };

  const handleUpdateStrategyParam = (
    strategyId: string,
    paramName: string,
    value: number
  ) => {
    setStrategyParams({
      ...strategyParams,
      [strategyId]: {
        ...strategyParams[strategyId],
        [paramName]: value,
      },
    });
  };

  const allStrategies = strategies?.length ? strategies : STRATEGIES;
  const mappedHistory = history?.map(mapHistoryRow) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backtesting</h1>
        <p className="text-muted-foreground">
          Complete backtesting engine: configure strategies, select symbols, analyze results
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        <div className="border-b mb-6">
          <TabsList className="flex w-full h-auto bg-transparent p-0 rounded-none gap-0">
            <TabsTrigger
              value="run"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-none border-b-2 border-transparent data-active:border-primary data-active:text-foreground text-muted-foreground hover:text-foreground transition-colors"
            >
              <Play className="h-4 w-4" />
              Run Backtest
            </TabsTrigger>
            <TabsTrigger
              value="strategy-config"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-none border-b-2 border-transparent data-active:border-primary data-active:text-foreground text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Strategy Config
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-none border-b-2 border-transparent data-active:border-primary data-active:text-foreground text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Run Backtest */}
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
                      {ALL_SYMBOLS.map((s) => (
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
                          {(activeResult.winRate || 0).toFixed(1)}%
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
                  <div className="flex flex-col items-center justify-center h-[380px] text-center gap-4">
                    <BarChart3 className="h-14 w-14 text-muted-foreground/30" />
                    <div>
                      <h3 className="text-base font-semibold">No Results Yet</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Configure a strategy and run a backtest to see results here.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-2">
                      {["Total Return", "Win Rate", "Sharpe Ratio", "Max Drawdown"].map((label) => (
                        <div key={label} className="border rounded-lg p-3 text-left opacity-30">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div className="h-5 w-14 bg-muted rounded mt-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Strategy Config */}
        <TabsContent value="strategy-config" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {STRATEGIES.map((strategy) => (
              <Card key={strategy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <Badge variant="secondary">{strategy.type}</Badge>
                  </div>
                  <CardDescription>{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Parameter Inputs */}
                  <div className="space-y-3">
                    {Object.entries(strategy.defaultParams).map(
                      ([paramName, defaultValue]) => (
                        <div key={paramName}>
                          <Label className="text-sm capitalize">
                            {paramName.replace(/([A-Z])/g, " $1").toLowerCase()}
                          </Label>
                          <Input
                            type="number"
                            step={
                              typeof defaultValue === "number" &&
                              defaultValue < 10
                                ? "0.1"
                                : "1"
                            }
                            value={
                              strategyParams[strategy.id]?.[paramName] ||
                              defaultValue
                            }
                            onChange={(e) =>
                              handleUpdateStrategyParam(
                                strategy.id,
                                paramName,
                                parseFloat(e.target.value)
                              )
                            }
                            className="mt-1"
                            placeholder={String(defaultValue)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Default: {defaultValue}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() =>
                        handleSelectAndApplyStrategy(strategy.id)
                      }
                    >
                      Select & Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleResetStrategyParams(strategy.id)
                      }
                    >
                      Reset
                    </Button>
                  </div>

                  {selectedStrategy === strategy.id && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      Selected for backtest
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: History */}
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
              ) : mappedHistory?.length ? (
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
                    {mappedHistory.map((result, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {result.strategyName || "N/A"}
                        </TableCell>
                        <TableCell>{result.symbol}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(result.startDate || "")} -{" "}
                          {formatDate(result.endDate || "")}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            (result.totalReturnPercent || 0) >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {formatPercent(result.totalReturnPercent || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(result.winRate || 0).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {(result.sharpeRatio || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveResult(result as BacktestResult);
                              setActiveTab("run");
                            }}
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
