import { Action, State } from '@elizaos/core';

export interface ActionDefinition {
  name: string;
  description: string;
  handler: (message: string, walletAddress?: string) => Promise<Action | null>;
  validator: (message: string, walletAddress?: string) => boolean;
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
