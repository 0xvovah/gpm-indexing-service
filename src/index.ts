import { ponder } from "@/generated";
import axios from "axios";
import { zeroAddress } from "viem";
import { ClubPoolABI, UniswapV2Pair } from "../abis";

ponder.on("clubPool:NewToken", async ({ event, context }) => {
  const { Token, Candle } = context.db;

  const id = `${context.network.chainId}-${event.args.token}`;

  await Token.upsert({
    id,
    create: {
      chainId: BigInt(context.network.chainId),
      address: event.args.token,
      creator: event.args.creator,
      name: event.args.name,
      symbol: event.args.symbol,
      raiseToken: event.args.raiseToken,
      maxCap: event.args.maxCap,
      startTime: event.args.startTime,
      price: event.args.tokenPrice,
      lastTradeAt: event.block.timestamp,
      featured: event.args.featured,
    },
    update: ({ current }) => ({
      chainId: BigInt(context.network.chainId),
      address: event.args.token,
      creator: event.args.creator,
      name: event.args.name,
      symbol: event.args.symbol,
      raiseToken: event.args.raiseToken,
      maxCap: event.args.maxCap,
      startTime: event.args.startTime,
      price: event.args.tokenPrice,
      lastTradeAt: event.block.timestamp,
      featured: event.args.featured,
    }),
  });

  const timestamp = Math.floor(Number(event.block.timestamp) / 60) * 60;
  const tokenId = `${context.network.chainId}-${event.args.token}-${timestamp}`;

  await Candle.create({
    id: tokenId,
    data: {
      chainId: BigInt(context.network.chainId),
      token: event.args.token,
      open: event.args.tokenPrice,
      close: event.args.tokenPrice,
      high: event.args.tokenPrice,
      low: event.args.tokenPrice,
      volume: 0n,
      timestamp: BigInt(timestamp),
    },
  });

  await axios
    .post(`${process.env.BACKEND_API_URL}/tokens/create`, {
      chainId: context.network.chainId,
      address: event.args.token,
      name: event.args.name,
      symbol: event.args.symbol,
      price: Number(event.args.tokenPrice),
      featured: event.args.featured,
      createdAt: Number(event.block.timestamp),
      creator: event.args.creator,
    })
    .then(() => {})
    .catch((err) => {
      console.error(err);
    });
});

ponder.on("clubPool:Trade", async ({ event, context }) => {
  const { Trade, Token, Candle } = context.db;

  const id = `${context.network.chainId}-${event.transaction.hash}`;

  await Trade.upsert({
    id,
    create: {
      transactionHash: event.transaction.hash,
      chainId: BigInt(context.network.chainId),
      token: event.args.token,
      account: event.args.account,
      tokenAmount: event.args.tokenAmount,
      raiseAmount: event.args.raiseAmount,
      tokenPrice: event.args.tokenPrice,
      isBuy: event.args.isBuy,
      tradeAt: event.block.timestamp,
    },
    update: ({ current }) => ({
      chainId: BigInt(context.network.chainId),
      transactionHash: event.transaction.hash,
      token: event.args.token,
      account: event.args.account,
      tokenAmount: event.args.tokenAmount,
      raiseAmount: event.args.raiseAmount,
      tokenPrice: event.args.tokenPrice,
      isBuy: event.args.isBuy,
      tradeAt: event.block.timestamp,
    }),
  });

  // Update candlesticks
  const token = await Token.findUnique({
    id: `${context.network.chainId}-${event.args.token}`,
  });
  if (token) {
    const timestamp = Math.floor(Number(event.block.timestamp) / 60) * 60;
    const tokenId = `${context.network.chainId}-${event.args.token}-${timestamp}`;

    await Candle.upsert({
      id: tokenId,
      create: {
        chainId: BigInt(context.network.chainId),
        token: event.args.token,
        open: token.price,
        close: event.args.tokenPrice,
        high: event.args.tokenPrice,
        low: event.args.tokenPrice,
        volume: event.args.raiseAmount,
        timestamp: BigInt(timestamp),
      },
      update: ({ current }) => ({
        close: event.args.tokenPrice,
        high: BigInt(
          Math.max(Number(current.high), Number(event.args.tokenPrice))
        ),
        low: BigInt(
          Math.min(Number(current.low), Number(event.args.tokenPrice))
        ),
        volume: current.volume + event.args.raiseAmount,
        timestamp: BigInt(timestamp),
      }),
    });

    await Token.update({
      id: `${context.network.chainId}-${event.args.token}`,
      data: {
        lastTradeAt: event.block.timestamp,
        price: event.args.tokenPrice,
      },
    });
  }

  await axios
    .post(`${process.env.BACKEND_API_URL}/tokens/${event.args.token}/trade`, {
      chainId: context.network.chainId,
      price: Number(event.args.tokenPrice),
      tradeAt: Number(event.block.timestamp),
      from: event.args.account,
      tokenAmount: Number(event.args.tokenAmount),
      raiseAmount: Number(event.args.raiseAmount),
      isBuy: event.args.isBuy,
      hash: event.transaction.hash,
      isDex: false,
    })
    .then(() => {})
    .catch((err) => {
      console.error(err);
    });
});

ponder.on("token:Transfer", async ({ event, context }) => {
  const { Holder } = context.db;

  if (event.args.from != zeroAddress) {
    const holderId = `${context.network.chainId}-${event.log.address}-${event.args.from}`;
    await Holder.upsert({
      id: holderId,
      create: {
        chainId: BigInt(context.network.chainId),
        token: event.log.address,
        account: event.args.from,
        amount: event.args.value,
      },
      update: ({ current }) => ({
        chainId: BigInt(context.network.chainId),
        token: event.log.address,
        account: event.args.from,
        amount: current.amount - event.args.value,
      }),
    });
  }
  if (event.args.to != zeroAddress) {
    const holderId = `${context.network.chainId}-${event.log.address}-${event.args.to}`;
    await Holder.upsert({
      id: holderId,
      create: {
        chainId: BigInt(context.network.chainId),
        token: event.log.address,
        account: event.args.to,
        amount: event.args.value,
      },
      update: ({ current }) => ({
        chainId: BigInt(context.network.chainId),
        token: event.log.address,
        account: event.args.to,
        amount: current.amount + event.args.value,
      }),
    });
  }
});

ponder.on("clubPool:AddLiquidity", async ({ event, context }) => {
  const { Token, DexCandle } = context.db;

  const tokenPrice =
    (event.args.ethReserve * 10n ** 18n) / event.args.tokenReserve;
  const token = await Token.update({
    id: `${context.network.chainId}-${event.args.token}`,
    data: {
      dexPair: event.args.pair,
      price: tokenPrice,
    },
  });
  const timestamp = Math.floor(Number(event.block.timestamp) / 60) * 60;
  const candleId = `${context.network.chainId}-${event.args.pair}-${timestamp}`;
  await DexCandle.create({
    id: candleId,
    data: {
      chainId: BigInt(context.network.chainId),
      token: token.address,
      dexPair: event.args.pair,
      open: tokenPrice,
      close: tokenPrice,
      high: tokenPrice,
      low: tokenPrice,
      volume: 0n,
      timestamp: BigInt(timestamp),
    },
  });

  await axios
    .post(`${process.env.BACKEND_API_URL}/tokens/${event.args.token}/dex`, {
      chainId: Number(context.network.chainId),
      dexPair: event.args.pair,
      dexAt: Number(event.block.timestamp),
      seeder: event.args.account,
    })
    .then(() => {})
    .catch((err) => {
      console.error(err);
    });
});

ponder.on("pair:Swap", async ({ event, context }) => {
  const { Token, DexCandle, Trade } = context.db;
  const { client } = context;

  const pairAddr = event.log.address;

  const { items: tokens } = await Token.findMany({
    where: {
      dexPair: pairAddr.toLowerCase() as `0x${string}`,
    },
  });

  if (tokens.length == 0) {
    return;
  }

  const token = tokens[0];
  const reserves = await client.readContract({
    address: pairAddr,
    abi: UniswapV2Pair,
    functionName: "getReserves",
    blockNumber: event.block.number,
  });
  const firstToken = await client.readContract({
    address: pairAddr,
    abi: UniswapV2Pair,
    functionName: "token0",
    blockNumber: event.block.number,
  });
  const isFirstToken = firstToken.toLowerCase() == token?.address.toLowerCase();
  const tokenPrice = isFirstToken
    ? (reserves[1] * 10n ** 18n) / reserves[0]
    : (reserves[0] * 10n ** 18n) / reserves[1];
  const isBuy = isFirstToken
    ? event.args.amount0Out > 0
    : event.args.amount1Out > 0;
  const tokenAmount = isBuy
    ? isFirstToken
      ? event.args.amount0Out
      : event.args.amount1Out
    : isFirstToken
    ? event.args.amount0In
    : event.args.amount1In;
  const raiseAmount = isBuy
    ? isFirstToken
      ? event.args.amount1In
      : event.args.amount0In
    : isFirstToken
    ? event.args.amount1Out
    : event.args.amount0Out;

  const timestamp = Math.floor(Number(event.block.timestamp) / 60) * 60;
  const candleId = `${context.network.chainId}-${pairAddr}-${timestamp}`;
  await DexCandle.upsert({
    id: candleId,
    create: {
      chainId: BigInt(context.network.chainId),
      token: token!.address,
      dexPair: pairAddr,
      open: token!.price,
      close: tokenPrice,
      high: tokenPrice,
      low: tokenPrice,
      volume: raiseAmount,
      timestamp: BigInt(timestamp),
    },
    update: ({ current }) => ({
      close: tokenPrice,
      high: BigInt(Math.max(Number(current.high), Number(tokenPrice))),
      low: BigInt(Math.min(Number(current.low), Number(tokenPrice))),
      volume: current.volume + raiseAmount,
      timestamp: BigInt(timestamp),
    }),
  });
  await Token.update({
    id: token!.id,
    data: {
      lastTradeAt: event.block.timestamp,
      price: tokenPrice,
    },
  });

  await Trade.upsert({
    id: `${context.network.chainId}-${event.transaction.hash}`,
    create: {
      transactionHash: event.transaction.hash,
      chainId: BigInt(context.network.chainId),
      token: token!.address,
      account: event.transaction.from,
      tokenAmount: tokenAmount,
      raiseAmount: raiseAmount,
      tokenPrice: tokenPrice,
      isBuy: isBuy,
      tradeAt: event.block.timestamp,
    },
    update: ({ current }) => ({
      chainId: BigInt(context.network.chainId),
      transactionHash: event.transaction.hash,
      token: token!.address,
      account: event.transaction.from,
      tokenAmount: tokenAmount,
      raiseAmount: raiseAmount,
      tokenPrice: tokenPrice,
      isBuy: isBuy,
      tradeAt: event.block.timestamp,
    }),
  });

  await axios
    .post(`${process.env.BACKEND_API_URL}/tokens/${token!.address}/trade`, {
      chainId: context.network.chainId,
      price: Number(tokenPrice),
      tradeAt: Number(event.block.timestamp),
      from: event.transaction.from,
      tokenAmount: Number(tokenAmount),
      raiseAmount: Number(raiseAmount),
      isBuy: isBuy,
      hash: event.transaction.hash,
      isDex: true,
    })
    .then(() => {})
    .catch((err) => {
      console.error(err);
    });
});
