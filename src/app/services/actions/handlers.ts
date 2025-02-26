import { Action } from '@elizaos/core';
import {
  fetchTokenBalance,
  fetchLiquidityPools,
  fetchYieldFarms,
  fetchTransactionHistory,
  fetchStakeData
} from './api';
import { formatTokenBalance, formatLiquidityPools, formatYieldFarms, formatTransactions, formatStakeData } from './formatters';
import { FALLBACK_MESSAGES } from '../../config/constants';
import { ActionResponse } from './types';
import { StakingService } from '../staking';
import { ActionContext } from './types';
import { STAKING_CONFIG } from '../../config/staking';
import { signActionMessage } from '../../utils/signing';

export async function handleTokenBalance(walletAddress: string, tokenAddress: string): Promise<ActionResponse> {
  try {
    const balance = await fetchTokenBalance(walletAddress, tokenAddress);
    return {
      type: 'TOKEN_BALANCE',
      data: balance,
      message: formatTokenBalance(balance)
    };
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch token balance. Please try again later.'
    };
  }
}

export async function handleLiquidityPools(): Promise<ActionResponse> {
  try {
    const pools = await fetchLiquidityPools();
    
    // Format the pools data into a user-friendly message
    const poolsMessage = pools.map((pool: { pair: any; tvl: any; apr: any; volume24h: any; }) => 
      `${pool.pair}\n` +
      `• TVL: ${pool.tvl}\n` +
      `• APR: ${pool.apr}\n` +
      `• 24h Volume: ${pool.volume24h}`
    ).join('\n\n');

    return {
      type: 'READ_DAPP',
      data: pools,
      message: `Available Liquidity Pools:\n\n${poolsMessage}\n\nNote: For the most up-to-date information, visit https://app.sonic.ooo/swap. Source: sonic_dex`,
      
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch liquidity pools. Please try again later.'
    };
  }
}

export async function handleYieldFarms(): Promise<ActionResponse> {
  try {
    const farms = await fetchYieldFarms();
    return {
      type: 'YIELD_FARMS',
      data: farms,
      message: formatYieldFarms(farms)
    };
  } catch (error) {
    console.error('Error fetching yield farms:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch yield farms. Please try again later.'
    };
  }
}

export async function handleTransactionHistory(walletAddress: string): Promise<ActionResponse> {
  try {
    const transactions = await fetchTransactionHistory(walletAddress);
    return {
      type: 'TRANSACTION_HISTORY',
      data: transactions,
      message: formatTransactions(transactions)
    };
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch transaction history. Please try again later.'
    };
  }
}

export async function handleStakeOnSonic(): Promise<ActionResponse> {
  try {
    const stakeData = await fetchStakeData();
    return {
      type: 'STAKE_ON_SONIC',
      data: stakeData,
      message: formatStakeData(stakeData)
    };
  } catch (error) {
    console.error('Error fetching stake data:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch stake data. Please try again later.'
    };
  }
}

export const stakingHandlers = {
  async stakeTokens(params: { validatorId: string; amount: string }, context: ActionContext) {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    // Get signature first
    const signature = await signActionMessage(
      context.walletClient,
      'stakeTokens',
      params
    );

    const staking = new StakingService(
      context.publicClient, 
      context.walletClient
    );

    return await staking.stakeTokens(
      parseInt(params.validatorId),
      params.amount,
      signature
    );
  },

  async claimSRewards(params: { validatorId: string }, context: ActionContext) {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    // Get signature first
    const signature = await signActionMessage(
      context.walletClient,
      'claimSRewards',
      params
    );

    const staking = new StakingService(
      context.publicClient, 
      context.walletClient
    );

    return await staking.claimRewards(
      parseInt(params.validatorId),
      signature
    );
  },

  async unstakeSTokens(params: { validatorId: string; amount: string }, context: ActionContext) {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    // Get signature first
    const signature = await signActionMessage(
      context.walletClient,
      'unstakeSTokens',
      params
    );

    const staking = new StakingService(
      context.publicClient, 
      context.walletClient
    );

    return await staking.unstake(
      parseInt(params.validatorId),
      params.amount,
      signature
    );
  }
};

