import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    ronin: {
      url: process.env.RONIN_RPC_URL || "https://api.roninchain.com/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2020,
    },
    saigon: {
      url: "https://saigon-testnet.roninchain.com/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2021,
    }
  },
  etherscan: {
    apiKey: {
      ronin: process.env.RONIN_EXPLORER_API_KEY || ""
    }
  }
};

export default config;