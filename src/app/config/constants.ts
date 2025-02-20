// API Base URLs
export const SONIC_API_BASE_URL = 'https://api.sonic.ooo/v1';
export const DEBRIDGE_API_BASE_URL = 'https://api.debridge.finance/v1';

// Timeouts
export const API_TIMEOUT = 10000; // 10 seconds

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: 'Invalid address provided',
  API_TIMEOUT: 'Request timed out',
  NETWORK_ERROR: 'Network error occurred',
  INVALID_RESPONSE: 'Invalid response from server',
  BRIDGE_ERROR: 'Bridge operation failed'
};

// Supported Chains for Bridging
export const SUPPORTED_CHAINS = {
  ETHEREUM: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
  },
  BSC: {
    id: 56,
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-dataseed.binance.org'
  },
  ARBITRUM: {
    id: 42161,
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc'
  },
  BASE: {
    id: 8453,
    name: 'Base',
    rpc: 'https://mainnet.base.org'
  }
};

// Fallback Data
export const FALLBACK_MESSAGES = {
  LIQUIDITY_POOLS: `Here are the available liquidity pools on Sonic:

1. ICP/ckBTC
   • TVL: $2.5M
   • APR: 12.5%
   • 24h Volume: $150K

2. ICP/USDC
   • TVL: $1.8M
   • APR: 8.2%
   • 24h Volume: $220K

3. ckBTC/USDC
   • TVL: $900K
   • APR: 15.1%
   • 24h Volume: $80K`,
  BRIDGE_ROUTES: `Available bridge routes:
    • Ethereum ↔ BSC
    • Ethereum ↔ Arbitrum
    • Ethereum ↔ Base
    • BSC ↔ Arbitrum`
}; 