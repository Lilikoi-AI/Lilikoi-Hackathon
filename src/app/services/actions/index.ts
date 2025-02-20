import { ActionDefinition } from './types';
import { handleTokenBalance, handleLiquidityPools, handleYieldFarms, handleTransactionHistory } from './handlers';

export const actions: ActionDefinition[] = [
  {
    name: 'getTokenBalance',
    description: 'Check token balance for a wallet. Use when users ask about their token holdings or balances.',
    handler: async (message: string, walletAddress?: string) => {
      if (!walletAddress) return null;
      return handleTokenBalance(walletAddress, 'SONIC_TOKEN_ADDRESS');
    },
    validator: (message: string, walletAddress?: string) => !!walletAddress
  },
  {
    name: 'getLiquidityPools',
    description: 'View available liquidity pools. Use when users ask about pools, liquidity, or trading pairs.',
    handler: async () => handleLiquidityPools(),
    validator: () => true
  },
  {
    name: 'getYieldFarms',
    description: 'Check yield farming opportunities. Use when users ask about farming, staking, or earning rewards.',
    handler: async () => handleYieldFarms(),
    validator: () => true
  },
  {
    name: 'getTransactionHistory',
    description: 'View transaction history. Use when users ask about their past transactions or trading history.',
    handler: async (message: string, walletAddress?: string) => {
      if (!walletAddress) return null;
      return handleTransactionHistory(walletAddress);
    },
    validator: (message: string, walletAddress?: string) => !!walletAddress
  }
];

export * from './types';
export * from './api';
export * from './handlers';
export * from './formatters';
