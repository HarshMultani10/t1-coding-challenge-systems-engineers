export interface RawMarketMessage {
    messageType: "market";
    buyPrice: string;
    sellPrice: string;
    startTime: string;
    endTime: string; 
}

export interface MarketMessage {
    messageType: "market";
    buyPrice: number;
    sellPrice: number;
    startTime: Date;
    endTime: Date;
}

export interface RawTradeMessage {
    messageType: "trades";
    tradeType: "BUY" | "SELL";
    volume: string;
    time: string;
}

export interface TradeMessage {
    messageType: "trades";
    tradeType: "BUY" | "SELL";
    volume: number;
    time: Date;
}

export interface PnLCalculation {
    _id?: string;
    startTime: Date;
    endTime: Date;
    buyPrice: number;
    sellPrice: number;
    buyVolume: number;
    sellVolume: number;
    pnl: number;
    createdAt: Date;
}

export interface PnL {
    startTime: string;
    endTime: string;
    pnl: number;
} 