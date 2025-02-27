/* eslint-disable @typescript-eslint/no-unused-vars */
// import { Chain } from 'wagmi'
// Unified chain configuration
export const SUPPORTED_CHAINS = {
  MAINNET: {
    ETHEREUM: { id: 1, name: 'Ethereum' },
    BSC: { id: 56, name: 'BSC' },
    ARBITRUM: { id: 42161, name: 'Arbitrum' },
    OPTIMISM: { id: 10, name: 'Optimism' },
    POLYGON: { id: 137, name: 'Polygon' },
    AVALANCHE: { id: 43114, name: 'Avalanche' },
    BASE: { id: 8453, name: 'Base' },
    SONIC: { id: 146, name: 'Sonic' }
  },
  TESTNET: {
    GOERLI: { id: 5, name: 'Goerli' },
    BSC_TESTNET: { id: 97, name: 'BSC Testnet' },
    ARBITRUM_GOERLI: { id: 421613, name: 'Arbitrum Goerli' },
    SONIC_BLAZE_TESTNET: { id: 57054, name: 'Sonic Blaze Testnet' },
  }
}

// Contract addresses
export const DEBRIDGE_CONTRACTS = {
  MAINNET: {
    DEBRIDGE_GATE: '0x43dE2d77BF8027e25dBD219c65D00a547eB30d37',
    CALL_PROXY: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  },
  TESTNET: {
    DEBRIDGE_GATE: '0x68D936Cb4723BdD38C488FD50514803f96789d2D',
    CALL_PROXY: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  }
}

// Protocol configuration
export const DEBRIDGE_CONFIG = {
  PROTOCOL_FEES: {
    ETHEREUM: '0.001', // ETH
    SONIC: '0.0001', // ETH
  },

  // Convert chain objects to id mapping for compatibility
  CHAINS: Object.entries(SUPPORTED_CHAINS.MAINNET).reduce((acc, [key, value]) => {
    acc[key] = value.id;
    return acc;
  }, {} as Record<string, number>),

  CONTRACTS: DEBRIDGE_CONTRACTS.MAINNET
}

// Helper functions
export const getDeBridgeProtocolFee = (chainId: number): string => {
  const chain = Object.entries(SUPPORTED_CHAINS.MAINNET)
    .find(([_, data]) => data.id === chainId)?.[0]
  return chain ? DEBRIDGE_CONFIG.PROTOCOL_FEES[chain as keyof typeof DEBRIDGE_CONFIG.PROTOCOL_FEES] : '0'
}

export const getDeBridgeContracts = (chainId: number, isTestnet = false) => {
  const contracts = isTestnet ? DEBRIDGE_CONTRACTS.TESTNET : DEBRIDGE_CONTRACTS.MAINNET
  const chainConfig = isTestnet ? SUPPORTED_CHAINS.TESTNET : SUPPORTED_CHAINS.MAINNET
  
  const chain = Object.entries(chainConfig)
    .find(([_, data]) => data.id === chainId)?.[0]
  
  return chain ? contracts : null
}

// Get chain name by ID
export const getChainName = (chainId: number, isTestnet = false): string | null => {
  const chains = isTestnet ? SUPPORTED_CHAINS.TESTNET : SUPPORTED_CHAINS.MAINNET
  const chain = Object.values(chains).find(chain => chain.id === chainId)
  return chain?.name || null
}

// Get chain ID by name
export const getChainId = (chainName: string, isTestnet = false): number | null => {
  const chains = isTestnet ? SUPPORTED_CHAINS.TESTNET : SUPPORTED_CHAINS.MAINNET
  return Object.values(chains).find(chain => chain.name === chainName)?.id || null
}

export const DEBRIDGE_TESTNET_CONFIG = {
  CHAINS: {
    GOERLI: {
      id: 5,
      deBridgeGate: '0x68D936Cb4723BdD38C488FD50514803f96789d2D'
    },
    BSC_TESTNET: {
      id: 97,
      deBridgeGate: '0x68D936Cb4723BdD38C488FD50514803f96789d2D'
    },
    ARBITRUM_GOERLI: {
      id: 421613,
      deBridgeGate: '0x68D936Cb4723BdD38C488FD50514803f96789d2D'
    }
  }
} 