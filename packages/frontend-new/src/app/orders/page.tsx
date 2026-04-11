"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrders, usePlaceOrder, useCancelOrder } from "@/lib/api";
import { ClipboardList, Plus, X, Loader2 } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "filled":
      return "default";
    case "pending":
    case "submitted":
      return "secondary";
    case "cancelled":
      return "outline";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const placeOrder = usePlaceOrder();
  const cancelOrder = useCancelOrder();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    symbol: "",
    action: "BUY" as "BUY" | "SELL",
    quantity: 1,
    orderType: "MKT",
    limitPrice: 0,
  });

  const handlePlaceOrder = () => {
    placeOrder.mutate(newOrder, {
      onSuccess: () => {
        setDialogOpen(false);
        setNewOrder({ symbol: "", action: "BUY", quantity: 1, orderType: "MKT", limitPrice: 0 });
      },
    });
  };

  const pendingOrders = orders?.filter((o) => 
    ["pending", "submitted", "presubmitted"].includes(o.status.toLowerCase())
  ) || [];
  
  const filledOrders = orders?.filter((o) => 
    o.status.toLowerCase() === "filled"
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage your orders</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place New Order</DialogTitle>
              <DialogDescription>
                Submit a new order to IBKR
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="AAPL"
                  value={newOrder.symbol}
                  onChange={(e) => setNewOrder({ ...newOrder, symbol: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={newOrder.action}
                    onValueChange={(v) => v && setNewOrder({ ...newOrder, action: v as "BUY" | "SELL" })}
                  >
                    <SelectTrigger id="action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="orderType">Order Type</Label>
                  <Select
                    value={newOrder.orderType}
                    onValueChange={(v) => v && setNewOrder({ ...newOrder, orderType: v })}
                  >
                    <SelectTrigger id="orderType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MKT">Market</SelectItem>
                      <SelectItem value="LMT">Limit</SelectItem>
                      <SelectItem value="STP">Stop</SelectItem>
                      <SelectItem value="STP LMT">Stop Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newOrder.orderType !== "MKT" && (
                  <div className="grid gap-2">
                    <Label htmlFor="limitPrice">Price</Label>
                    <Input
                      id="limitPrice"
                      type="number"
                      step="0.01"
                      value={newOrder.limitPrice}
                      onChange={(e) => setNewOrder({ ...newOrder, limitPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePlaceOrder} disabled={!newOrder.symbol || placeOrder.isPending}>
                {placeOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Orders</CardTitle>
          <CardDescription>Orders awaiting execution</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : pendingOrders.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-mono">{order.orderId}</TableCell>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={order.action === "BUY" ? "default" : "destructive"}>
                        {order.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{order.quantity}</TableCell>
                    <TableCell>{order.orderType}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelOrder.mutate(order.orderId)}
                        disabled={cancelOrder.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pending orders
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filled Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Filled Orders</CardTitle>
          <CardDescription>Recently executed orders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filledOrders.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Filled</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filledOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-mono">{order.orderId}</TableCell>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={order.action === "BUY" ? "default" : "destructive"}>
                        {order.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{order.filledQuantity}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.avgFillPrice)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No filled orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
