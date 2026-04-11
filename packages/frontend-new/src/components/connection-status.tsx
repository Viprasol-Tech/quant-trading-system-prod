"use client";

import { useSystemStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function ConnectionStatus() {
  const { data, isLoading, error } = useSystemStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-muted-foreground">Connecting...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-muted-foreground">Backend Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${
            data.ibkrConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-muted-foreground">IBKR</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${
            data.dataFeedActive ? "bg-green-500" : "bg-yellow-500"
          }`}
        />
        <span className="text-muted-foreground">Data</span>
      </div>
      {data.tradingEnabled && (
        <Badge variant="default" className="bg-green-600 text-xs">
          LIVE
        </Badge>
      )}
    </div>
  );
}
