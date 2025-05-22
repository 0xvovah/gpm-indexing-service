import { createConfig } from "@ponder/core";
import { http, parseAbiItem } from "viem";

import { ClubPoolABI, ERC20ABI, UniswapV2Pair } from "./abis";

// console.log(process.env.PONDER_RPC_URL_11155111);
console.log(process.env.PONDER_RPC_URL_369);

export default createConfig({
  networks: {
    // sepolia: {
    //   chainId: 11155111,
    //   transport: http(process.env.PONDER_RPC_URL_11155111),
    //   pollingInterval: 15_000,
    // },
    // pulseMainnet: {
    //   chainId: 943,
    //   transport: http(process.env.PONDER_RPC_URL_943),
    //   pollingInterval: 15_000,
    // },
    pulseMainnet: {
      chainId: 369,
      transport: http(process.env.PONDER_RPC_URL_369),
      pollingInterval: 15_000,
    },
  },
  contracts: {
    clubPool: {
      abi: ClubPoolABI,
      address: "0x2a0D403815eb35D1e2658B806E5c27f72129FdFd",
      network: {
        pulseMainnet: {
          startBlock: 22565947,
        },
      },
    },

    token: {
      abi: ERC20ABI,
      network: {
        pulseMainnet: {
          startBlock: 22565947,
        },
      },
      factory: {
        address: "0x2a0D403815eb35D1e2658B806E5c27f72129FdFd",
        event: parseAbiItem(
          "event NewToken(address indexed token,address creator,address raiseToken,string name,string symbol,uint maxSupply,uint maxCap,uint startTime,uint tokenPrice,bool featured)"
        ),
        parameter: "token",
      },
    },

    pair: {
      abi: UniswapV2Pair,
      network: {
        pulseMainnet: {
          startBlock: 22565947,
        },
      },
      factory: {
        address: "0x2a0D403815eb35D1e2658B806E5c27f72129FdFd",
        event: parseAbiItem(
          "event AddLiquidity(address indexed token, address pair, uint tokenReserve, uint ethReserve, address account)"
        ),
        parameter: "pair",
      },
    },
  },
});
