import { Action } from '@elizaos/core';
import {
  fetchTokenBalance,
  fetchLiquidityPools,
  fetchYieldFarms,
  fetchTransactionHistory,
  fetchStakeData,
  fetchValidatorsList
} from './api';
import { formatTokenBalance, formatLiquidityPools, formatYieldFarms, formatTransactions, formatStakeData } from './formatters';
import { FALLBACK_MESSAGES } from '../../config/constants';
import { ActionResponse } from './types';
import { StakingService } from '../staking';
import { ActionContext } from './types';
import { STAKING_CONFIG } from '../../config/staking';
import { signActionMessage } from '../../utils/signing';
import { formatEther } from 'ethers';

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

export async function handleBridgeTokens(): Promise<ActionResponse> {
  try {
    const bridgeData = await fetchBridgeData();
    return {
      type: 'BRIDGE_TOKENS',
      data: bridgeData,
      message: formatBridgeData(bridgeData)
    };
  } catch (error) {
    console.error('Error fetching bridge data:', error);
    return {  
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch bridge data. Please try again later.'
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

export async function handleValidatorsList(): Promise<ActionResponse> {
  try {
    const validators = await fetchValidatorsList();
    
    if (validators.length === 0) {
      return {
        type: 'VALIDATORS_LIST',
        data: [],
        message: 'No active validators found. Please try again later.'
      };
    }
    
    // Format the validators data into a user-friendly message
    const validatorsMessage = validators.map(validator => 
      `Validator #${validator.validatorId}\n` +
      `• Status: ${validator.status === 1 ? '🟢 Active' : '🔴 Inactive'}\n` +
      `• Total Stake: ${validator.totalStake} S\n` +
      `• APR: ${validator.apr.toFixed(2)}%\n` +
      `• Uptime: ${validator.uptime.toFixed(2)}%\n` +
      `• Commission: ${validator.commission.toFixed(2)}%`
    ).join('\n\n');

    return {
      type: 'VALIDATORS_LIST',
      data: validators,
      message: `Available Validators:\n\n${validatorsMessage}\n\nTo stake with a validator, use their ID number. Minimum stake amount: ${STAKING_CONFIG.MIN_STAKE} S tokens.`
    };
  } catch (error) {
    console.error('Error fetching validators list:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Unable to fetch validators list. Please ensure you are connected to the Sonic network and try again.'
    };
  }
}

export async function handleUserStakingPositions(address: string, context: ActionContext): Promise<ActionResponse> {
  try {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    const staking = new StakingService(
      context.publicClient,
      context.walletClient
    );

    // Get current epoch and active validators
    const currentEpoch = await staking.getCurrentEpoch();
    console.log('Current epoch:', currentEpoch.toString());
    
    const activeValidatorIds = await staking.getEpochValidatorIDs(currentEpoch);
    console.log('Active validators in current epoch:', activeValidatorIds.map(id => Number(id)).join(', '));

    // Check stakes for all active validators
    const positions = await Promise.all(
      activeValidatorIds.map(async (id) => {
        const validatorId = Number(id);
        const stake = await staking.getStake(address as `0x${string}`, validatorId);
        const rewards = await staking.getPendingRewards(address as `0x${string}`, validatorId);
        
        if (parseFloat(formatEther(stake)) > 0) {
          console.log(`Found stake with Validator #${validatorId}:`, formatEther(stake));
        }
        
        return {
          validatorId,
          stakedAmount: formatEther(stake),
          pendingRewards: formatEther(rewards)
        };
      })
    );

    const activePositions = positions.filter(p => parseFloat(p.stakedAmount) > 0);

    if (activePositions.length === 0) {
      return {
        type: 'USER_STAKING_POSITIONS',
        data: [],
        message: 'You currently have no active staking positions.'
      };
    }

    const positionsMessage = activePositions.map(pos => 
      `Validator #${pos.validatorId}\n` +
      `• Staked Amount: ${pos.stakedAmount} S\n` +
      `• Pending Rewards: ${pos.pendingRewards} S`
    ).join('\n\n');

    return {
      type: 'USER_STAKING_POSITIONS',
      data: activePositions,
      message: `Your Active Staking Positions:\n\n${positionsMessage}`
    };
  } catch (error) {
    console.error('Error fetching user staking positions:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch your staking positions. Please ensure you are connected to the Sonic network and try again.'
    };
  }
}

export const stakingHandlers = {
  async stakeTokens(params: Record<string, any>, context: ActionContext) {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    const staking = new StakingService(
      context.publicClient, 
      context.walletClient
    );

    try {
      const hash = await staking.stakeTokens(
        parseInt(params.validatorId),
        params.amount
      );
      
      return {
        success: true,
        hash,
        message: `Successfully staked ${params.amount} S tokens to validator #${params.validatorId}`
      };
    } catch (error) {
      console.error('Staking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async claimSRewards(params: Record<string, any>, context: ActionContext) {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    const staking = new StakingService(
      context.publicClient, 
      context.walletClient
    );

    try {
      const hash = await staking.claimRewards(
        parseInt(params.validatorId)
      );
      
      return {
        success: true,
        hash,
        message: `Successfully claimed rewards from validator #${params.validatorId}`
      };
    } catch (error) {
      console.error('Claiming rewards failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  async unstakeSTokens(params: Record<string, any>, context: ActionContext) {
    if (!context.publicClient || !context.walletClient) {
      throw new Error('Wallet not connected');
    }

    const staking = new StakingService(
      context.publicClient, 
      context.walletClient
    );

    try {
      const hash = await staking.unstake(
        parseInt(params.validatorId),
        params.amount
      );
      
      return {
        success: true,
        hash,
        message: `Successfully unstaked ${params.amount} S tokens from validator #${params.validatorId}`
      };
    } catch (error) {
      console.error('Unstaking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};

