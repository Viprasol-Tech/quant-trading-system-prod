export declare const config: {
    node: {
        env: string;
        port: number;
        logLevel: string;
    };
    alpaca: {
        apiKey: string;
        apiSecret: string;
        baseUrl: string;
        dataUrl: string;
    };
    ibkr: {
        gatewayHost: string;
        gatewayPort: number;
        username: string;
        password: string;
        accountId: string;
        clientId: number;
        tradingMode: string;
    };
    massive: {
        apiKey: string;
        apiUrl: string;
    };
    python: {
        serviceUrl: string;
        timeout: number;
    };
    risk: {
        maxPositionRiskPercent: number;
        maxPositionSizePercent: number;
        kellyCeiling: number;
        maxPortfolioHeat: number;
        maxPositions: number;
        maxPerStrategy: number;
        maxSectorPercent: number;
        maxStopPercent: number;
        atrStopMultiplier: number;
        chandelierMultiplier: number;
        useFixedPercentStop: boolean;
        drawdownYellowPercent: number;
        drawdownOrangePercent: number;
        drawdownRedPercent: number;
        drawdownHaltPercent: number;
        takeProfitRRRatio: number;
        partialExitPct: number;
        trailRemaining: boolean;
    };
    strategies: {
        strategy1: {
            enabled: boolean;
            atrPeriod: number;
            atrMultiplier: number;
            maFast: number;
            maSlow: number;
            rsiPeriod: number;
            rsiMin: number;
            rsiMax: number;
            rvolThreshold: number;
            minConfidence: number;
        };
        strategy2: {
            enabled: boolean;
            maPeriod: number;
            fibLevelMin: number;
            fibLevelMax: number;
            rsiPeriod: number;
            rsiThreshold: number;
            volumeThreshold: number;
            minConfidence: number;
        };
        strategy3: {
            enabled: boolean;
            trendWeight: number;
            momentumWeight: number;
            volumeWeight: number;
            patternWeight: number;
            regimeWeight: number;
            volatilityWeight: number;
            threshold: number;
            minConfidence: number;
        };
    };
    indicators: {
        maPeriods: number[];
        rsi: {
            period: number;
            overbought: number;
            oversold: number;
        };
        macd: {
            fast: number;
            slow: number;
            signal: number;
        };
        bb: {
            period: number;
            stdDev: number;
        };
        atr: {
            period: number;
        };
    };
    market: {
        primaryTimeframe: string;
        secondaryTimeframes: string[];
        marketOpenHour: number;
        marketOpenMinute: number;
        marketCloseHour: number;
        marketCloseMinute: number;
        tradingTimezone: string;
        slippageBps: number;
        commissionPerShare: number;
        lookbackPeriodDays: number;
        minDataPoints: number;
    };
    shariah: {
        enabled: boolean;
        equityDebtLimit: number;
        haramIncomeLimit: number;
        enforceLongOnly: boolean;
        enforceNoLeverage: boolean;
        enforceNoDerivatives: boolean;
    };
    notifications: {
        enableTradeAlerts: boolean;
        alertOnSignal: boolean;
        alertOnRiskLimit: boolean;
        alertOnError: boolean;
    };
    health: {
        checkIntervalMs: number;
        timeoutMs: number;
    };
};
//# sourceMappingURL=environment.d.ts.map