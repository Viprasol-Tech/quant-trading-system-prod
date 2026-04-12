"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketData } from "@/lib/api";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "SPY", "QQQ"];

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toString();
}

export default function MarketDataPage() {
  const [search, setSearch] = useState("");
  const { data: marketData, isLoading, error } = useMarketData(DEFAULT_SYMBOLS);

  // Filter out error responses and search results
  const filteredData = marketData
    ?.filter((item: any) => !item.error && item.bid !== undefined) // Only valid quotes
    .filter((item) =>
      item.symbol.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Data</h1>
        <p className="text-muted-foreground">Real-time quotes from IBKR</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Quotes</CardTitle>
          <CardDescription>Real-time market data with 1-second refresh</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !marketData ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !marketData && error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to fetch market data</p>
              <p className="text-sm mt-1">Check IBKR connection</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Last</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Bid</TableHead>
                  <TableHead className="text-right">Ask</TableHead>
                  <TableHead className="text-right">High</TableHead>
                  <TableHead className="text-right">Low</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredData || []).map((quote) => (
                  <TableRow key={quote.symbol}>
                    <TableCell>
                      <div className="font-medium">{quote.symbol}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${formatPrice(quote.last)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {quote.change >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`font-mono ${
                            quote.change >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {quote.change >= 0 ? "+" : ""}
                          {quote.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      ${formatPrice(quote.bid)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      ${formatPrice(quote.ask)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${formatPrice(quote.high)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${formatPrice(quote.low)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatVolume(quote.volume)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
