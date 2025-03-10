import { ActionDefinition } from './types';
import {
  handleTokenBalance,
  handleLiquidityPools,
  handleYieldFarms,
  handleTransactionHistory,
  handleStakeOnSonic,
  handleBridgeTokens,
  handleDeBridgeTokens,
  handleWalletTokens
} from './handlers';
import { getTokenAddress, getDebridgeChainId, DEBRIDGE_CHAIN_IDS } from './debridge-token';

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
    name: 'getWalletTokens',
    description: 'Get all tokens in a wallet. Use when users ask what tokens they have or about their token holdings without specifying a particular token.',
    parameters: {
      chainId: 'Chain ID (optional, defaults to Sonic)'
    },
    validate: (params) => {
      return {
        isValid: true, // No required parameters
        error: null
      };
    },
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleWalletTokens(context.walletAddress, params.chainId || '100000014', context);
    },
  },
  {
    name: 'getTokenBalanceOnChain',
    description: 'Check token balance for a specific token on a specific chain. Use when users ask about their token balance on a specific chain.',
    parameters: {
      chainName: 'Chain name (e.g., ETHEREUM, SONIC)',
      tokenSymbol: 'Token symbol (e.g., USDC, S)'
    },
    validate: (params) => {
      return {
        isValid: !!params.chainName && !!params.tokenSymbol,
        error: !params.chainName 
          ? 'Chain name is required' 
          : !params.tokenSymbol 
          ? 'Token symbol is required' 
          : null
      };
    },
    handler: async (params, context) => {
      try {
        if (!context.walletAddress) return null;
        
        // Get chain ID from chain name
        const chainId = getDebridgeChainId(params.chainName);
        if (!chainId) {
          return {
            type: 'ERROR',
            data: { error: `Invalid chain name: ${params.chainName}` },
            message: `Invalid chain name: ${params.chainName}. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`
          };
        }
        
        // Fetch tokens from the wallet on the specified chain
        const tokens = await fetchWalletTokens(context.walletAddress, chainId);
        
        // Find the specific token
        const token = tokens.find(t => t.symbol.toLowerCase() === params.tokenSymbol.toLowerCase());
        
        if (!token) {
          return {
            type: 'TOKEN_BALANCE_ON_CHAIN',
            data: { 
              chainName: params.chainName,
              tokenSymbol: params.tokenSymbol,
              balance: '0',
              found: false
            },
            message: `You don't have any ${params.tokenSymbol} tokens on ${params.chainName}.`
          };
        }
        
        // Construct response message
        const message = `Your ${token.symbol} (${token.name}) balance on ${params.chainName}: ${token.balance}`;
        
        return {
          type: 'TOKEN_BALANCE_ON_CHAIN',
          data: { 
            chainName: params.chainName,
            tokenSymbol: params.tokenSymbol,
            balance: token.balance,
            name: token.name,
            symbol: token.symbol,
            found: true
          },
          message
        };
      } catch (error: any) {
        console.error('Error getting token balance on chain:', error);
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting token balance: ${error.message || 'Unknown error'}`
        };
      }
    }
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
  /*
  {
    name: 'bridgeTokens',
    description: 'Bridge tokens between chains. Use when users ask about bridging, transferring, or moving tokens between chains.',
    parameters: {},
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleBridgeTokens(context.walletAddress);
    },  
  },
  */
  { 
    name: 'stakeOnSonic',
    description: 'Stake S (Sonic native tokens) with a Sonic Validator. Use when users ask about staking, delegating, or depositing tokens.',
    parameters: {},
    handler: async (params, context) => {
      if (!context.walletAddress) return null;
      return handleStakeOnSonic(context.walletAddress);
    },
  },
  // New deBridge actions
  {
    name: 'getTokenAddress',
    description: 'Get token address on a specific chain. Use when users ask about token addresses or contract addresses.',
    parameters: {
      chainId: 'Chain ID in deBridge format (e.g., 1 for Ethereum, 100000014 for Sonic)',
      symbol: 'Token symbol (e.g., USDC, S)'
    },
    validate: (params) => {
      return {
        isValid: !!params.chainId && !!params.symbol,
        error: !params.chainId 
          ? 'Chain ID is required' 
          : !params.symbol 
          ? 'Token symbol is required' 
          : null
      };
    },
    handler: async (params) => {
      try {
        // Validate parameters
        if (!params.chainId || !params.symbol) {
          throw new Error('Missing required parameters. Please provide chain ID and token symbol.');
        }
        
        // Import the token address functions
        const { getTokenAddress, getTokenDecimals } = await import('./debridge-token');
        
        // Fetch token address
        console.log(`Fetching token address for ${params.symbol} on chain ${params.chainId}`);
        const tokenAddress = await getTokenAddress(params.chainId, params.symbol);
        
        if (!tokenAddress) {
          return {
            type: 'TOKEN_ADDRESS',
            data: { 
              chainId: params.chainId,
              symbol: params.symbol,
              address: null,
              found: false
            },
            message: `Token ${params.symbol} not found on chain ${params.chainId}`
          };
        }
        
        // Check if this is a native token
        const isNativeToken = tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        console.log(`Found token address: ${tokenAddress}${isNativeToken ? ' (Native Token)' : ''}`);
        
        // Fetch token decimals
        console.log(`Fetching decimals for ${params.symbol} on chain ${params.chainId}`);
        const decimals = await getTokenDecimals(params.chainId, params.symbol) || 18;
        console.log(`Token ${params.symbol} has ${decimals} decimals`);
        
        // Construct response message
        let message = `Token Information for ${params.symbol} on chain ${params.chainId}:\n\n`;
        message += `Address: ${tokenAddress}${isNativeToken ? ' (Native Token)' : ''}\n`;
        message += `Decimals: ${decimals}`;
        
        return {
          type: 'TOKEN_ADDRESS',
          data: { 
            chainId: params.chainId,
            symbol: params.symbol,
            address: tokenAddress,
            isNativeToken,
            decimals,
            found: true
          },
          message
        };
      } catch (error: any) {
        console.error('Error getting token address:', error);
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting token address: ${error.message || 'Unknown error'}`
        };
      }
    }
  },
  {
    name: 'bridgeWithDeBridge',
    description: 'Bridge tokens between chains using deBridge. Use when users want to bridge tokens between supported chains.',
    parameters: {
      sourceChain: `Source chain (${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')})`,
      destinationChain: `Destination chain (${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')})`,
      tokenSymbol: 'Token symbol (e.g., USDC, S)',
      amount: 'Amount to bridge'
    },
    validate: (params) => {
      const sourceChainId = getDebridgeChainId(params.sourceChain);
      const destChainId = getDebridgeChainId(params.destinationChain);
      const amount = parseFloat(params.amount);
      
      return {
        isValid: 
          !!sourceChainId && 
          !!destChainId && 
          !!params.tokenSymbol &&
          !isNaN(amount) && 
          amount > 0,
        error: !sourceChainId 
          ? `Invalid source chain. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}` 
          : !destChainId 
          ? `Invalid destination chain. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}` 
          : !params.tokenSymbol 
          ? 'Token symbol is required' 
          : isNaN(amount) || amount <= 0 
          ? 'Invalid amount' 
          : null
      };
    },
    handler: async (params, context) => {
      return handleDeBridgeTokens(params, context);
    }
  }
];

export * from './types';
export * from './api';
export * from './handlers';
export * from './formatters';
