import { ActionDefinition } from './types';
import {
  handleTokenBalance,
  handleLiquidityPools,
  handleYieldFarms,
  handleTransactionHistory,
  handleStakeOnSonic,
  handleBridgeTokens
} from './handlers';

export const actions: ActionDefinition[] = [
  {
    name: 'getTokenBalance',
    description: 'Check token balance for a wallet. Use when users ask about their token holdings or balances.',
    parameters: {
      tokenAddress: 'Token address to check balance for'
    },
    validate: (params) => {
      const tokenAddress = params.tokenAddress;
      return {
        isValid: !!tokenAddress,
        error: !tokenAddress ? 'Token address is required' : null
      };
    },
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleTokenBalance(context.walletAddress, params.tokenAddress);
    },
  },
  {
    name: 'getLiquidityPools',
    description: 'View available liquidity pools. Use when users ask about pools, liquidity, or trading pairs.',
    parameters: {},
    handler: async () => handleLiquidityPools(),
  },
  {
    name: 'getYieldFarms',
    description: 'Check yield farming opportunities. Use when users ask about farming, staking, or earning rewards.',
    parameters: {},
    handler: async () => handleYieldFarms(),
  },
  {
    name: 'getTransactionHistory',
    description: 'View transaction history. Use when users ask about their past transactions or trading history.',
    parameters: {},
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleTransactionHistory(context.walletAddress);
    },
  },
  {
    name: 'bridgeTokens',
    description: 'Bridge tokens between chains. Use when users ask about bridging, transferring, or moving tokens between chains.',
    parameters: {},
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleBridgeTokens(context.walletAddress);
    },  
  },
  { 
    name: 'stakeOnSonic',
    description: 'Stake S (Sonic native tokens) with a Sonic Validator. Use when users ask about staking, delegating, or depositing tokens.',
    parameters: {},
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleStakeOnSonic(context.walletAddress);
    },
  },
];

export * from './types';
export * from './api';
export * from './handlers';
export * from './formatters';
