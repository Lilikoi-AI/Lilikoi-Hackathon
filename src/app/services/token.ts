import { ethers } from 'ethers';
import { SONIC_RPC } from '../constants';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

// Basic ERC20 ABI for common operations
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)"
];

// Example token registry for common tokens
const tokenRegistry: Record<string, TokenInfo> = {
  'USDC': {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum mainnet
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    chainId: 1
  },
  'ETH': {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Special address for native ETH
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    chainId: 1
  },
  'SONIC': {
    address: '0x0000000000000000000000000000000000012553', // Sonic native token
    name: 'Sonic',
    symbol: 'SONIC',
    decimals: 18,
    chainId: 12553
  }
};

// Dynamic token registry for tokens from external sources
const dynamicTokenRegistry: Record<string, TokenInfo> = {};

export class TokenService {
  private static provider = new ethers.JsonRpcProvider(SONIC_RPC);
  
  /**
   * Get token information by symbol
   */
  static async getTokenInfo(symbol: string): Promise<TokenInfo | null> {
    const normalizedSymbol = symbol.toUpperCase();
    
    // Check static registry first
    if (normalizedSymbol in tokenRegistry) {
      return tokenRegistry[normalizedSymbol];
    }
    
    // Check dynamic registry
    if (normalizedSymbol in dynamicTokenRegistry) {
      return dynamicTokenRegistry[normalizedSymbol];
    }
    
    // If not found, try to fetch from external source or auto-register
    try {
      // This is where we could query a token API
      // For now, we'll create a placeholder entry
      const tokenInfo = this.registerToken(symbol, {
        name: symbol,
        symbol: normalizedSymbol,
        decimals: 18, // Assume 18 decimals as default
        chainId: 12553 // Assume Sonic Chain
      });
      
      return tokenInfo;
    } catch (e) {
      console.error(`Failed to get info for token ${symbol}:`, e);
      return null;
    }
  }
  
  /**
   * Register a new token dynamically
   */
  static registerToken(
    symbol: string,
    info: Omit<TokenInfo, 'address'>,
    address?: string
  ): TokenInfo {
    const normalizedSymbol = symbol.toUpperCase();
    
    // If we have an address, use it
    // Otherwise generate a placeholder that will be overridden when needed
    const tokenAddress = address || `0x${Buffer.from(normalizedSymbol).toString('hex').padStart(40, '0').slice(0, 40)}`;
    
    const tokenInfo: TokenInfo = {
      address: tokenAddress,
      name: info.name,
      symbol: normalizedSymbol,
      decimals: info.decimals,
      chainId: info.chainId
    };
    
    // Add to dynamic registry
    dynamicTokenRegistry[normalizedSymbol] = tokenInfo;
    console.log(`Registered token ${normalizedSymbol} with address ${tokenAddress}`);
    
    return tokenInfo;
  }
  
  /**
   * Get token balance for an address
   */
  static async getTokenBalance(
    walletAddress: string,
    tokenSymbol: string
  ): Promise<bigint> {
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }
    
    // Handle native ETH differently
    if (tokenInfo.symbol === 'ETH' || tokenInfo.symbol === 'SONIC') {
      const balance = await this.provider.getBalance(walletAddress);
      return balance;
    }
    
    // For ERC20 tokens
    const tokenContract = new ethers.Contract(
      tokenInfo.address,
      ERC20_ABI,
      this.provider
    );
    
    const balance = await tokenContract.balanceOf(walletAddress);
    return balance;
  }
  
  /**
   * Get token allowance for a spender
   */
  static async getTokenAllowance(
    ownerAddress: string,
    spenderAddress: string,
    tokenSymbol: string
  ): Promise<bigint> {
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }
    
    // Native assets don't need allowance
    if (tokenInfo.symbol === 'ETH' || tokenInfo.symbol === 'SONIC') {
      return ethers.MaxUint256;
    }
    
    const tokenContract = new ethers.Contract(
      tokenInfo.address,
      ERC20_ABI,
      this.provider
    );
    
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    return allowance;
  }
  
  /**
   * Approve token spending
   */
  static async approveToken(
    signer: ethers.Signer,
    spenderAddress: string,
    tokenSymbol: string,
    amount: bigint
  ): Promise<ethers.TransactionResponse> {
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }
    
    // Native assets don't need approval
    if (tokenInfo.symbol === 'ETH' || tokenInfo.symbol === 'SONIC') {
      throw new Error(`Cannot approve native asset ${tokenSymbol}`);
    }
    
    const tokenContract = new ethers.Contract(
      tokenInfo.address,
      ERC20_ABI,
      signer
    );
    
    const tx = await tokenContract.approve(spenderAddress, amount);
    return tx;
  }
  
  /**
   * Get token address
   */
  static async getTokenAddress(tokenSymbol: string): Promise<string> {
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }
    
    return tokenInfo.address;
  }
  
  /**
   * Check if a token is supported
   */
  static async isTokenSupported(tokenSymbol: string): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo(tokenSymbol);
    return !!tokenInfo;
  }
  
  /**
   * Get token price in USD
   */
  static async getTokenPrice(tokenSymbol: string): Promise<number | null> {
    try {
      // In a real implementation, this would fetch price from an API
      // For now, return some example values
      const priceMap: Record<string, number> = {
        'USDC': 1.00,
        'ETH': 3500,
        'SONIC': 5.75,
        'BTC': 62000,
        'WS-FROQ': 0.075
      };
      
      const normalizedSymbol = tokenSymbol.toUpperCase();
      return priceMap[normalizedSymbol] || null;
    } catch (error) {
      console.error(`Error fetching price for ${tokenSymbol}:`, error);
      return null;
    }
  }
} 