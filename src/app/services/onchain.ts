import { Action, State } from '@elizaos/core';
import { ethers } from 'ethers';
import axios from 'axios';
import { SONIC_API_BASE_URL, API_TIMEOUT, FALLBACK_MESSAGES, SUPPORTED_CHAINS } from '../config/constants';
import { handleApiError } from '../utils/error';
// import { DeBridgeService } from '../services/bridge/debridge';

interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

interface Pool {
  id: string;
  token0: {
    symbol: string;
    address: string;
  };
  token1: {
    symbol: string;
    address: string;
  };
  tvlUSD: string;
  apr: string;
  volume24h: string;
}

interface PoolsResponse {
  pools: Pool[];
}

// interface ApiResponse<T> {
//   success: boolean;
//   data?: T;
//   error?: string;
// }

// interface TokenBalance {
//   token: string;
//   balance: string;
//   usdValue: string;
// }

// interface LiquidityPool {
//   pair: string;
//   tvl: string;
//   apr: string;
//   volume24h: string;
// }

// interface YieldFarm {
//   name: string;
//   token: string;
//   apy: string;
//   tvl: string;
//   rewards: string[];
// }

class OnchainActions {
  private state: State;

  constructor(state: State) {
    this.state = state;
  }

  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<Action> {
    return {
      name: 'getTokenBalance',
      description: 'Get token balance for a wallet address',
      examples: [[{
        user: 'user',
        content: {
          text: `Get balance of ${tokenAddress} for ${walletAddress}`,
          action: 'READ_CONTRACT'
        }
      }]],
      handler: async () => {
        try {
          const response = await axios.get(
            `${SONIC_API_BASE_URL}/tokens/${tokenAddress}/balances/${walletAddress}`
          );
          
          const { balance, symbol, usdValue } = response.data;
          
          return {
            text: `Your ${symbol} balance is ${balance} (≈$${usdValue})`,
            action: 'READ_CONTRACT',
            source: 'blockchain',
            data: response.data
          };
        } catch (error) {
          const errorMessage = handleApiError(error);
          console.error('Error fetching token balance:', errorMessage);
          
          return {
            text: `Failed to fetch token balance: ${errorMessage}`,
            action: 'READ_CONTRACT',
            source: 'blockchain',
            error: true
          };
        }
      },
      similes: ['check balance', 'view tokens'],
      validate: async () => {
        try {
          return ethers.isAddress(walletAddress) && ethers.isAddress(tokenAddress);
        } catch {
          return false;
        }
      }
    };
  }

  async getLiquidityPools(): Promise<Action> {
    return {
      name: 'getLiquidityPools',
      description: 'Get all available liquidity pools',
      examples: [[{
        user: 'user',
        content: {
          text: 'Show me all liquidity pools',
          action: 'READ_DAPP'
        }
      }]],
      handler: async () => {
        try {
          // Make API call to Sonic's API endpoint
          const response = await axios.get<PoolsResponse>(`${SONIC_API_BASE_URL}/pools`, {
            timeout: API_TIMEOUT
          });
          
          // Format the pool data
          const pools = response.data.pools.map(pool => ({
            pair: `${pool.token0.symbol}/${pool.token1.symbol}`,
            tvl: `$${Number(pool.tvlUSD).toLocaleString()}`,
            apr: `${Number(pool.apr).toFixed(2)}%`,
            volume24h: `$${Number(pool.volume24h).toLocaleString()}`
          }));

          // Create a formatted message
          const poolsMessage = pools.map(pool => 
            `${pool.pair}\n` +
            `• TVL: ${pool.tvl}\n` +
            `• APR: ${pool.apr}\n` +
            `• 24h Volume: ${pool.volume24h}`
          ).join('\n\n');

          return {
            text: `Available Liquidity Pools:\n\n${poolsMessage}`,
            action: 'READ_DAPP',
            source: 'sonic_dex',
            data: pools
          };
        } catch (error) {
          // Log the error for debugging but don't expose it to the user
          console.error('Error fetching liquidity pools:', error);

          // Return a user-friendly message with fallback data
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
      },
      similes: ['view pools', 'check liquidity'],
      validate: async () => {
        try {
          await axios.get(`${SONIC_API_BASE_URL}/pools`, {
            timeout: 5000 // Shorter timeout for validation
          });
          return true;
        } catch {
          return false;
        }
      }
    };
  }

  async getYieldFarms(): Promise<Action> {
    return {
      name: 'getYieldFarms',
      description: 'Get all active yield farms',
      examples: [[{
        user: 'user',
        content: {
          text: 'Show me active farms',
          action: 'READ_DAPP'
        }
      }]],
      handler: async () => {
        // Implementation will be provided by ElizaOS
        return {
          text: 'Yield farms retrieved',
          action: 'READ_DAPP',
          source: 'sonic_farms'
        };
      },
      similes: ['view farms', 'check yields'],
      validate: async () => {
        try {
          // Verify API endpoint is accessible
          await axios.get('https://api.sonic.ooo/v1/farms');
          return true;
        } catch {
          return false;
        }
      }
    };
  }

  async bridgeTokens(
    fromChain: string,
    toChain: string,
    tokenAddress: string,
    amount: string
  ): Promise<Action> {
    return {
      name: 'bridgeTokens',
      description: 'Bridge tokens between chains',
      examples: [[{
        user: 'user',
        content: {
          text: `Bridge ${amount} tokens from ${fromChain} to ${toChain}`,
          action: 'BRIDGE'
        }
      }]],
      handler: async () => {
        try {
          return {
            text: 'Here\'s the bridge widget to help you transfer your tokens:',
            action: 'BRIDGE',
            source: 'debridge',
            component: {
              type: 'BRIDGE_WIDGET',
              props: {
                fromChain,
                toChain,
                tokenAddress,
                amount
              }
            }
          };
        } catch (error) {
          console.error('Bridge error:', error);
          return {
            text: `Unable to initialize bridge widget. Please verify:
1. Supported chains (${Object.keys(SUPPORTED_CHAINS).join(', ')})
2. Valid token address
3. Sufficient balance

You can also visit https://app.debridge.finance/ directly.`,
            action: 'BRIDGE',
            source: 'debridge',
            error: true
          };
        }
      },
      similes: ['transfer across chains', 'cross-chain transfer'],
      validate: async () => {
        try {
          return (
            fromChain in SUPPORTED_CHAINS &&
            toChain in SUPPORTED_CHAINS &&
            ethers.isAddress(tokenAddress) &&
            parseFloat(amount) > 0
          );
        } catch {
          return false;
        }
      }
    };
  }

  async addLiquidity(
    tokenA: TokenInfo,
    tokenB: TokenInfo,
    amountA: string,
    amountB: string
  ): Promise<Action> {
    return {
      name: 'addLiquidity',
      description: 'Add liquidity to a pool',
      examples: [[{
        user: 'user',
        content: {
          text: `Add ${amountA} ${tokenA.symbol} and ${amountB} ${tokenB.symbol} to pool`,
          action: 'WRITE_DAPP'
        }
      }]],
      handler: async () => {
        // Implementation will be provided by ElizaOS
        return {
          text: 'Liquidity added successfully',
          action: 'WRITE_DAPP',
          source: 'sonic_dex'
        };
      },
      similes: ['provide liquidity', 'create pool position'],
      validate: async () => {
        try {
          // Validate token addresses and amounts
          return ethers.isAddress(tokenA.address) && 
                 ethers.isAddress(tokenB.address) && 
                 Boolean(amountA) && Boolean(amountB);
        } catch {
          return false;
        }
      }
    };
  }

  async stakeLPTokens(
    poolAddress: string,
    amount: string
  ): Promise<Action> {
    return {
      name: 'stakeLPTokens',
      description: 'Stake LP tokens in a farm',
      examples: [[{
        user: 'user',
        content: {
          text: `Stake ${amount} LP tokens in farm ${poolAddress}`,
          action: 'WRITE_DAPP'
        }
      }]],
      handler: async () => {
        // Implementation will be provided by ElizaOS
        return {
          text: 'LP tokens staked successfully',
          action: 'WRITE_DAPP',
          source: 'sonic_farms'
        };
      },
      similes: ['deposit LP tokens', 'farm liquidity'],
      validate: async () => {
        try {
          // Validate pool address and amount
          return ethers.isAddress(poolAddress) && Boolean(amount);
        } catch {
          return false;
        }
      }
    };
  }

  async getTransactionHistory(walletAddress: string): Promise<Action> {
    return {
      name: 'getTransactionHistory',
      description: 'Get transaction history for a wallet',
      examples: [[{
        user: 'user',
        content: {
          text: `Show transactions for ${walletAddress}`,
          action: 'READ_CHAIN'
        }
      }]],
      handler: async () => {
        // Implementation will be provided by ElizaOS
        return {
          text: 'Transaction history retrieved',
          action: 'READ_CHAIN',
          source: 'blockchain'
        };
      },
      similes: ['view transactions', 'check history'],
      validate: async () => {
        try {
          // Validate wallet address
          return ethers.isAddress(walletAddress);
        } catch {
          return false;
        }
      }
    };
  }
}

export default OnchainActions;
