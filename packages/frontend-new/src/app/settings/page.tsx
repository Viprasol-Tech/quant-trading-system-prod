"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSystemStatus } from "@/lib/api";
import { Settings, Database, Wifi, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  const { data: status } = useSystemStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your trading system</p>
      </div>

      <div className="grid gap-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              <CardTitle>Connection</CardTitle>
            </div>
            <CardDescription>IBKR Gateway connection settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>IBKR Connection Status</Label>
                <p className="text-sm text-muted-foreground">Current connection state</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${status?.ibkrConnected ? "bg-green-500" : "bg-red-500"}`} />
                <span>{status?.ibkrConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ibkrHost">IBKR Host</Label>
                <Input id="ibkrHost" defaultValue="127.0.0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibkrPort">IBKR Port</Label>
                <Input id="ibkrPort" defaultValue="7497" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input id="clientId" defaultValue="1" />
            </div>
            <Button>Reconnect</Button>
          </CardContent>
        </Card>

        {/* Data Feed Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Feed</CardTitle>
            </div>
            <CardDescription>Market data and backtest data sources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Data Feed Status</Label>
                <p className="text-sm text-muted-foreground">Real-time market data</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${status?.dataFeedActive ? "bg-green-500" : "bg-yellow-500"}`} />
                <span>{status?.dataFeedActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="polygonKey">Polygon.io API Key</Label>
              <Input id="polygonKey" type="password" placeholder="Enter your Polygon API key" />
              <p className="text-xs text-muted-foreground">Used for historical data in backtesting</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="massiveKey">Massive API Key</Label>
              <Input id="massiveKey" type="password" placeholder="Enter your Massive API key" />
              <p className="text-xs text-muted-foreground">Alternative data source for backtesting</p>
            </div>
          </CardContent>
        </Card>

        {/* Risk Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Risk Management</CardTitle>
            </div>
            <CardDescription>Configure risk limits and controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxDrawdown">Max Drawdown (%)</Label>
                <Input id="maxDrawdown" type="number" defaultValue="20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPositionSize">Max Position Size (%)</Label>
                <Input id="maxPositionSize" type="number" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDailyLoss">Max Daily Loss (%)</Label>
                <Input id="maxDailyLoss" type="number" defaultValue="5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxOpenPositions">Max Open Positions</Label>
                <Input id="maxOpenPositions" type="number" defaultValue="10" />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Stop Loss</Label>
                <p className="text-sm text-muted-foreground">Automatically place stop loss orders</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Kill Switch</Label>
                <p className="text-sm text-muted-foreground">Stop all trading on max drawdown</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Trade Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify on trade execution</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Risk Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify on risk threshold breach</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Signal Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify on new trading signals</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input id="webhookUrl" placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Send alerts to external service</p>
            </div>
          </CardContent>
        </Card>

        {/* Trading */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Trading</CardTitle>
            </div>
            <CardDescription>Trading execution settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Live Trading</Label>
                <p className="text-sm text-muted-foreground">Enable automated order execution</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${status?.tradingEnabled ? "bg-green-500" : "bg-yellow-500"}`} />
                <Switch checked={status?.tradingEnabled} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Paper Trading Mode</Label>
                <p className="text-sm text-muted-foreground">Simulate trades without real execution</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Confirm Orders</Label>
                <p className="text-sm text-muted-foreground">Require manual confirmation</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
