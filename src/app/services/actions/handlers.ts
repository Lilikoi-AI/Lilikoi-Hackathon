import { Action } from '@elizaos/core';
import {
  fetchTokenBalance,
  fetchLiquidityPools,
  fetchYieldFarms,
  fetchTransactionHistory,
  fetchStakeData,
  fetchValidatorsList,
  fetchWalletTokens
} from './api';
import { formatTokenBalance, formatLiquidityPools, formatYieldFarms, formatTransactions, formatStakeData, formatWalletTokens } from './formatters';
import { FALLBACK_MESSAGES } from '../../config/constants';
import { ActionResponse } from './types';
import { StakingService } from '../staking';
import { ActionContext } from './types';
import { STAKING_CONFIG } from '../../config/staking';
import { signActionMessage } from '../../utils/signing';
import { formatEther } from 'ethers';
import { DeBridgeService } from '../debridge';
import { getTokenAddress, getDebridgeChainId, DEBRIDGE_CHAIN_IDS } from './debridge-token';
import { getTokenDecimals } from './debridge-token';

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

export async function handleBridgeTokens(walletAddress: string): Promise<ActionResponse> {
  try {
    return {
      type: 'BRIDGE_TOKENS',
      data: null,
      message: 'Please provide the source chain, destination chain, token, and amount to bridge.'
    };
  } catch (error) {
    console.error('Error handling bridge tokens:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to handle bridge tokens. Please try again later.'
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

export async function handleDeBridgeTokens(
  params: {
    sourceChain: string;
    destinationChain: string;
    tokenSymbol: string;
    amount: string;
  },
  context: ActionContext
): Promise<ActionResponse> {
  try {
    if (!context.publicClient || !context.walletClient || !context.walletAddress) {
      throw new Error('Wallet not connected');
    }

    // Validate parameters
    if (!params.sourceChain || !params.destinationChain || !params.tokenSymbol || !params.amount) {
      return {
        type: 'ERROR',
        data: { error: 'Missing parameters' },
        message: 'Please provide source chain, destination chain, token symbol, and amount to bridge.'
      };
    }

    // Get deBridge chain IDs
    const sourceChainId = getDebridgeChainId(params.sourceChain.toUpperCase());
    const destChainId = getDebridgeChainId(params.destinationChain.toUpperCase());
    
    console.log(`Source chain: ${params.sourceChain} (ID: ${sourceChainId})`);
    console.log(`Destination chain: ${params.destinationChain} (ID: ${destChainId})`);
    console.log(`Available chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`);

    if (!sourceChainId) {
      return {
        type: 'ERROR',
        data: { error: 'Unsupported source chain' },
        message: `Unsupported source chain: ${params.sourceChain}. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`
      };
    }
    
    if (!destChainId) {
      return {
        type: 'ERROR',
        data: { error: 'Unsupported destination chain' },
        message: `Unsupported destination chain: ${params.destinationChain}. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`
      };
    }

    // Import the actions to use getTokenAddress action
    const { actions } = await import('./index');
    const getTokenAddressAction = actions.find(action => action.name === 'getTokenAddress');
    
    if (!getTokenAddressAction) {
      throw new Error('getTokenAddress action not found');
    }
    
    // First, fetch the token address on the source chain using getTokenAddress action
    console.log(`Fetching token address for ${params.tokenSymbol} on ${params.sourceChain} (chain ID: ${sourceChainId})`);
    
    const sourceTokenResult = await getTokenAddressAction.handler({
      chainId: sourceChainId,
      symbol: params.tokenSymbol
    }, context);
    
    if (sourceTokenResult.type === 'ERROR' || !sourceTokenResult.data.address) {
      return {
        type: 'ERROR',
        data: { error: 'Token not found' },
        message: `Token ${params.tokenSymbol} not found on ${params.sourceChain}: ${sourceTokenResult.message}`
      };
    }
    
    const sourceTokenAddress = sourceTokenResult.data.address;
    const isNativeToken = sourceTokenResult.data.isNativeToken;
    const decimals = sourceTokenResult.data.decimals || 18;
    
    console.log(`Found token address on source chain: ${sourceTokenAddress}`);
    console.log(`Token ${params.tokenSymbol} has ${decimals} decimals`);
    
    if (isNativeToken) {
      console.log(`${params.tokenSymbol} is a native token`);
    }

    // Also fetch the token address on the destination chain for reference
    console.log(`Fetching token address for ${params.tokenSymbol} on ${params.destinationChain} (chain ID: ${destChainId})`);
    let destTokenAddress = null;
    let destTokenDecimals = null;
    let isDestNative = false;
    
    try {
      const destTokenResult = await getTokenAddressAction.handler({
        chainId: destChainId,
        symbol: params.tokenSymbol
      }, context);
      
      if (destTokenResult.type !== 'ERROR' && destTokenResult.data.address) {
        destTokenAddress = destTokenResult.data.address;
        destTokenDecimals = destTokenResult.data.decimals || 18;
        isDestNative = destTokenResult.data.isNativeToken;
        console.log(`Found token address on destination chain: ${destTokenAddress}`);
      } else {
        console.warn(`Token ${params.tokenSymbol} not found on destination chain ${params.destinationChain}. It may be created during bridging.`);
      }
    } catch (error) {
      console.warn(`Warning: Could not fetch token ${params.tokenSymbol} on destination chain ${params.destinationChain}: ${error}`);
      // We don't return an error here as the token might be created during bridging
    }

    // Initialize deBridge service
    const deBridgeService = new DeBridgeService(
      context.publicClient,
      context.walletClient
    );

    // Prepare bridge parameters
    const bridgeParams = {
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      tokenSymbol: params.tokenSymbol,
      amount: params.amount,
      receiver: context.walletAddress,
      tokenAddress: sourceTokenAddress
    };

    // Get signature for the transaction
    const signature = await signActionMessage(
      context.walletClient,
      'bridgeWithDeBridge',
      bridgeParams
    );

    // Execute bridge transaction
    const txHash = await deBridgeService.bridgeWithDeBridge(bridgeParams);

    // Construct a detailed response message
    let responseMessage = `Successfully initiated bridging of ${params.amount} ${params.tokenSymbol} from ${params.sourceChain} to ${params.destinationChain}.\n\n`;
    responseMessage += `Source token address: ${sourceTokenAddress}${isNativeToken ? ' (Native Token)' : ''}\n`;
    responseMessage += `Token decimals: ${decimals}\n`;
    
    if (destTokenAddress) {
      responseMessage += `Destination token address: ${destTokenAddress}${isDestNative ? ' (Native Token)' : ''}\n`;
    } else {
      responseMessage += `Destination token address: Will be created during bridging\n`;
    }
    
    responseMessage += `\nTransaction hash: ${txHash}\n\n`;
    responseMessage += `Note: Bridging typically takes 5-15 minutes to complete. You can track the status of your transaction on the deBridge Explorer.`;

    return {
      type: 'BRIDGE_TOKENS',
      data: {
        txHash,
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        tokenSymbol: params.tokenSymbol,
        amount: params.amount,
        sourceTokenAddress,
        isNativeToken,
        decimals,
        destTokenAddress: destTokenAddress || 'Will be created during bridging'
      },
      message: responseMessage
    };
  } catch (error: any) {
    console.error('Error bridging tokens:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: `Failed to bridge tokens: ${error.message || 'Unknown error'}`
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

export async function handleWalletTokens(walletAddress: string, chainId: string, context: ActionContext): Promise<ActionResponse> {
  try {
    console.log(`Fetching tokens for wallet ${walletAddress} on chain ${chainId}`);
    
    // Fetch tokens from the wallet
    const tokens = await fetchWalletTokens(walletAddress, chainId);
    
    if (!tokens || tokens.length === 0) {
      return {
        type: 'WALLET_TOKENS',
        data: { tokens: [] },
        message: 'No tokens found in your wallet on this chain.'
      };
    }
    
    // Format the tokens for display
    const formattedMessage = formatWalletTokens(tokens);
    
    return {
      type: 'WALLET_TOKENS',
      data: { tokens },
      message: formattedMessage
    };
  } catch (error) {
    console.error('Error fetching wallet tokens:', error);
    return {
      type: 'ERROR',
      data: { error },
      message: 'Failed to fetch tokens in your wallet. Please try again later.'
    };
  }
}

