import axios from 'axios';

// Interface for token data
export interface TokenData {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logoURI?: string;
  tags?: Array<{Name: string}>;
  eip2612?: boolean;
}

// Interface for token list response
export interface TokenListResponse {
  tokens: {[address: string]: TokenData};
}

/**
 * Fetches token list from deBridge API for a specific chain
 * @param chainId - Chain ID in deBridge format (e.g., 100000014 for Sonic)
 * @returns Promise with token list data
 */
export async function fetchTokenList(chainId: string): Promise<TokenListResponse> {
  try {
    console.log(`Fetching token list from deBridge API for chain ${chainId}`);
    const response = await axios.get<TokenListResponse>(
      `https://deswap.debridge.finance/v1.0/token-list?chainId=${chainId}`
    );
    console.log(`Successfully fetched token list for chain ${chainId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching token list:', error);
    throw new Error('Failed to fetch token list from deBridge API');
  }
}

/**
 * Gets token address for a specific token symbol on a specific chain
 * @param chainId - Chain ID in deBridge format
 * @param symbol - Token symbol (e.g., 'USDC', 'S')
 * @returns Promise with token address or null if not found
 */
export async function getTokenAddress(chainId: string, symbol: string): Promise<string | null> {
  try {
    console.log(`Getting address for token ${symbol} on chain ${chainId}`);
    const tokenList = await fetchTokenList(chainId);
    
    // The API returns tokens as an object with addresses as keys
    // We need to convert it to an array to search by symbol
    const tokens = Object.values(tokenList.tokens);
    
    console.log(`Found ${tokens.length} tokens on chain ${chainId}`);
    
    // Find the token by symbol (case insensitive)
    const token = tokens.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    if (token) {
      console.log(`Found token ${symbol} on chain ${chainId} with address ${token.address}`);
      
      // Special case for native tokens (like S on Sonic)
      // If the address is the zero address and it's the native token, return a special marker
      if (token.address === '0x0000000000000000000000000000000000000000') {
        // For native tokens, we use this special address that deBridge recognizes
        console.log(`${symbol} is a native token, using special address`);
        return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      }
      
      return token.address;
    }
    
    console.log(`Token ${symbol} not found on chain ${chainId}`);
    return null;
  } catch (error) {
    console.error('Error getting token address:', error);
    throw new Error(`Failed to get address for token ${symbol} on chain ${chainId}`);
  }
}

/**
 * Chain ID mapping for deBridge API
 * These are the deBridge-specific chain IDs, different from standard chain IDs
 */
export const DEBRIDGE_CHAIN_IDS = {
  ETHEREUM: '1', // Ethereum Mainnet
  SONIC: '100000014', // Sonic
  BSC: '56', // Binance Smart Chain
  ARBITRUM: '42161', // Arbitrum
  OPTIMISM: '10', // Optimism
  POLYGON: '137', // Polygon
  AVALANCHE: '43114', // Avalanche
  BASE: '8453', // Base
};

/**
 * Converts a standard chain name to deBridge chain ID
 * @param chainName - Chain name (e.g., 'ethereum', 'sonic')
 * @returns deBridge chain ID or null if not supported
 */
export function getDebridgeChainId(chainName: string): string | null {
  // Normalize the chain name to uppercase for case-insensitive comparison
  const normalizedChainName = chainName.toUpperCase();
  
  // Handle common variations of chain names
  if (normalizedChainName === 'ETH') return DEBRIDGE_CHAIN_IDS.ETHEREUM;
  if (normalizedChainName === 'ETHEREUM MAINNET') return DEBRIDGE_CHAIN_IDS.ETHEREUM;
  if (normalizedChainName === 'SONIC BLOCKCHAIN' || normalizedChainName === 'SONIC CHAIN') return DEBRIDGE_CHAIN_IDS.SONIC;
  
  // Log the chain name for debugging
  console.log(`Looking up chain ID for: ${normalizedChainName}`);
  console.log(`Available chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`);
  
  // Return the chain ID if found, null otherwise
  return DEBRIDGE_CHAIN_IDS[normalizedChainName as keyof typeof DEBRIDGE_CHAIN_IDS] || null;
}

/**
 * Gets token decimals for a specific token symbol on a specific chain
 * @param chainId - Chain ID in deBridge format
 * @param symbol - Token symbol (e.g., 'USDC', 'S')
 * @returns Promise with token decimals or null if not found
 */
export async function getTokenDecimals(chainId: string, symbol: string): Promise<number | null> {
  try {
    const tokenList = await fetchTokenList(chainId);
    const tokens = Object.values(tokenList.tokens);
    const token = tokens.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
    return token ? token.decimals : null;
  } catch (error) {
    console.error('Error getting token decimals:', error);
    throw new Error(`Failed to get decimals for token ${symbol} on chain ${chainId}`);
  }
} 