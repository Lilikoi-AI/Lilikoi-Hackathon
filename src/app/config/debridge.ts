import { Chain } from 'wagmi'

export const SUPPORTED_CHAINS = {
  MAINNET: {
    ETHEREUM: 1,
    BSC: 56,
    ARBITRUM: 42161,
    OPTIMISM: 10,
    POLYGON: 137,
    AVALANCHE: 43114,
    BASE: 8453
  },
  TESTNET: {
    GOERLI: 5,
    BSC_TESTNET: 97,
    ARBITRUM_GOERLI: 421613
  }
}

export const DEBRIDGE_CONTRACTS = {
  MAINNET: {
    DEBRIDGE_GATE: '0x43dE2d77BF8027e25dBD219c65D00a547eB30d37',
    CALL_PROXY: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  },
  TESTNET: {
    // Goerli
    DEBRIDGE_GATE: '0x68D936Cb4723BdD38C488FD50514803f96789d2D',
    CALL_PROXY: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
  }
}

export const DEBRIDGE_CONFIG = {
  // Protocol fees per chain
  PROTOCOL_FEES: {
    ETHEREUM: '0.001', // ETH
    BSC: '0.002', // BNB
    ARBITRUM: '0.0001', // ETH
    BASE: '0.0001' // ETH
  },

  // Supported chains (using the same values as SUPPORTED_CHAINS)
  CHAINS: SUPPORTED_CHAINS.MAINNET,

  // Contract addresses (using the same values as DEBRIDGE_CONTRACTS)
  CONTRACTS: DEBRIDGE_CONTRACTS.MAINNET
}

// Helper functions
export const getDeBridgeProtocolFee = (chainId: number): string => {
  const chain = Object.entries(DEBRIDGE_CONFIG.CHAINS)
    .find(([_, id]) => id === chainId)?.[0]
  return chain ? DEBRIDGE_CONFIG.PROTOCOL_FEES[chain] : '0'
}

export const getDeBridgeContracts = (chainId: number) => {
  const chain = Object.entries(DEBRIDGE_CONFIG.CHAINS)
    .find(([_, id]) => id === chainId)?.[0]
  return chain ? DEBRIDGE_CONFIG.CONTRACTS[chain] : null
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