// Base URL for Sonic API
export const SONIC_API_BASE = 'https://api.sonic.ooo/v1';

// API endpoints
export const API_ENDPOINTS = {
  YIELD: {
    OPPORTUNITIES: '/yield/opportunities',
    FARMS: '/farms',
  },
  LIQUIDITY: {
    POOLS: '/pools',
    PAIRS: '/pairs',
  },
  TOKENS: {
    BALANCES: '/tokens/balances',
    PRICES: '/tokens/prices',
  },
} as const; 