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

export async function handleTokenBalance(walletAddress: string, tokenAddress: string): Promise<Action> {
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

export async function handleLiquidityPools(): Promise<Action> {
  try {
    const pools = await fetchLiquidityPools();
    
    // Format the pools data into a user-friendly message
    const poolsMessage = pools.map(pool => 
      `${pool.pair}\n` +
      `• TVL: ${pool.tvl}\n` +
      `• APR: ${pool.apr}\n` +
      `• 24h Volume: ${pool.volume24h}`
    ).join('\n\n');

    return {
      text: `Available Liquidity Pools:\n\n${poolsMessage}\n\nNote: For the most up-to-date information, visit https://app.sonic.ooo/swap`,
      action: 'READ_DAPP',
      source: 'sonic_dex',
      data: pools
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      text: `To view all liquidity pools available on the Sonic blockchain, you can:

1. View Major Pools:
${FALLBACK_MESSAGES.LIQUIDITY_POOLS}

2. Visit SonicSwap directly at https://app.sonic.ooo/swap

Note: Pool data may not be current due to temporary API issues. Please verify details on Sonic's interface.`,
      action: 'READ_DAPP',
      source: 'sonic_dex',
      error: true
    };
  }
}

export async function handleYieldFarms(): Promise<Action> {
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

export async function handleTransactionHistory(walletAddress: string): Promise<Action> {
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

export async function handleStakeOnSonic(): Promise<Action> {
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

