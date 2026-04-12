"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePositions } from "@/lib/api";
import { Briefcase, TrendingUp, TrendingDown, X } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, cost: number) {
  const percent = (value / cost) * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

export default function PositionsPage() {
  const { data: positions, isLoading, error } = usePositions();

  const totalValue = positions?.reduce((sum, p) => sum + parseFloat(p.market_value), 0) || 0;
  const totalPnL = positions?.reduce((sum, p) => sum + parseFloat(p.unrealized_pl), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Positions</h1>
        <p className="text-muted-foreground">Your current holdings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(totalPnL)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
          <CardDescription>All your current holdings from IBKR</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Unable to fetch positions</p>
              <p className="text-sm mt-1">Check IBKR connection</p>
            </div>
          ) : positions?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Market Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Unrealized P&L</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.symbol}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{position.symbol}</div>
                        <Badge variant={parseInt(position.qty) > 0 ? "default" : "destructive"}>
                          {parseInt(position.qty) > 0 ? "LONG" : "SHORT"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Math.abs(parseInt(position.qty))}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(parseFloat(position.avg_entry_price))}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(parseFloat(position.current_price))}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(parseFloat(position.market_value))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {parseFloat(position.unrealized_pl) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`font-mono ${
                            parseFloat(position.unrealized_pl) >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {formatCurrency(parseFloat(position.unrealized_pl))}
                        </span>
                      </div>
                      <div
                        className={`text-xs ${
                          parseFloat(position.unrealized_pl) >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatPercent(parseFloat(position.unrealized_pl), parseFloat(position.avg_entry_price) * Math.abs(parseInt(position.qty)))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No open positions</p>
              <p className="text-sm mt-1">Your positions will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
