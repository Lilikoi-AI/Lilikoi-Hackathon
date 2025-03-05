import { Action } from '@elizaos/core';


export interface ActionResponse {
  type: string;
  data: any;
  message: string;
}

export interface ActionDefinition {
  name: string;
  description: string;
  parameters: Record<string, string>;
  validate?: (params: Record<string, any>) => {
    isValid: boolean;
    error: string | null;
  };
  handler?: (params: Record<string, any>, context: ActionContext) => Promise<any>;
}

export interface ActionContext {
  chainId?: number;
  walletAddress?: string;
  publicClient?: any;
  walletClient?: any;
}

export interface TokenBalance {
  token: string;
  balance: string;
  usdValue: string;
}

export interface LiquidityPool {
  id: string;
  token0: string;
  token1: string;
  tvl: string;
  apr: string;
  volume24h: string;
}

export interface YieldFarm {
  id: string;
  name: string;
  token: string;
  apy: string;
  tvl: string;
  rewards: string[];
}

export interface Transaction {
  hash: string;
  type: 'swap' | 'addLiquidity' | 'removeLiquidity' | 'stake' | 'unstake';
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  details: Record<string, any>;
}

export interface ValidatorInfo {
  validatorId: number;
  status: number;
  totalStake: string;
  apr: number;
  uptime: number;
  commission: number;
}

export interface StakeData {
  id: string;
  token: string;
  validatorId: number;
  apr: string;
  tvl: string;
}

export interface StakingPosition {
  validatorId: number;
  stakedAmount: string;
  pendingRewards: string;
}