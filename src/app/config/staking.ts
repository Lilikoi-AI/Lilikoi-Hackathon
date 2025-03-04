export const STAKING_CONFIG = {
  // SFC (Sonic Flexible Consensus) contract address
  SFC_CONTRACT: process.env.NEXT_PUBLIC_SFC_CONTRACT_ADDRESS || '0xFC00FACE00000000000000000000000000000000',
  
  // Sonic (S) token contract address
  S_TOKEN: process.env.NEXT_PUBLIC_S_TOKEN_ADDRESS || '0x8c8687fC965593DFb2F0b4EAeFD55E9D8df348df',
  
  // Minimum stake amount in S tokens
  MIN_STAKE: '100',
  
  // Lock period in epochs
  LOCK_PERIOD: 2,
  
  // APR range
  APR: {
    MIN: '8.5',
    MAX: '15.2'
  },
  
  // List of active validators
  VALIDATORS: [
    { id: 1, name: 'Sonic Validator 1' },
    { id: 2, name: 'Sonic Validator 2' },
    { id: 3, name: 'Sonic Validator 3' }
  ]
} as const

// Helper functions
export const getValidatorById = (id: number) => {
  return STAKING_CONFIG.VALIDATORS.find(v => v.id === id)
}

export const getValidatorName = (id: number) => {
  return getValidatorById(id)?.name || `Validator ${id}`
} 