import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  Token: p.createTable({
    id: p.string(),
    chainId: p.bigint(),
    address: p.hex(),
    name: p.string(),
    symbol: p.string(),
    creator: p.hex(),
    raiseToken: p.hex(),
    startTime: p.bigint(),
    maxCap: p.bigint(),
    price: p.bigint(),
    lastTradeAt: p.bigint(),
    featured: p.boolean(),
    dexPair: p.hex().optional(),
  }),

  Trade: p.createTable({
    id: p.string(),
    chainId: p.bigint(),
    transactionHash: p.hex(),
    token: p.hex(),
    account: p.hex(),
    tokenAmount: p.bigint(),
    raiseAmount: p.bigint(),
    tokenPrice: p.bigint(),
    isBuy: p.boolean(),
    tradeAt: p.bigint(),
  }),

  Holder: p.createTable({
    id: p.string(),
    chainId: p.bigint(),
    token: p.hex(),
    account: p.hex(),
    amount: p.bigint(),
  }),

  Candle: p.createTable({
    id: p.string(),
    chainId: p.bigint(),
    token: p.hex(),
    open: p.bigint(),
    close: p.bigint(),
    high: p.bigint(),
    low: p.bigint(),
    volume: p.bigint(),
    timestamp: p.bigint(),
  }),

  DexCandle: p.createTable({
    id: p.string(),
    chainId: p.bigint(),
    token: p.hex(),
    dexPair: p.hex(),
    open: p.bigint(),
    close: p.bigint(),
    high: p.bigint(),
    low: p.bigint(),
    volume: p.bigint(),
    timestamp: p.bigint(),
  }),
}));
