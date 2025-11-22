import { ethers } from "ethers";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    ethers: typeof ethers & {
      getSigners(): Promise<ethers.Signer[]>;
      getContractFactory(name: string): Promise<ethers.ContractFactory>;
      provider: ethers.Provider;
    };
  }
}