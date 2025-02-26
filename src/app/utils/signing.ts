import { type WalletClient } from 'viem'

export const SIGNING_MESSAGES = {
  stakeTokens: (amount: string, validatorId: string) => 
    `I confirm that I want to stake ${amount} S tokens to validator ${validatorId}`,
  claimSRewards: (validatorId: string) => 
    `I confirm that I want to claim rewards from validator ${validatorId}`,
  unstakeSTokens: (amount: string, validatorId: string) => 
    `I confirm that I want to unstake ${amount} S tokens from validator ${validatorId}`,
  
  bridgeTokens: (params: { fromChain: string, toChain: string, amount: string, tokenAddress: string }) => 
    `I confirm that I want to bridge ${params.amount} tokens from ${params.fromChain} to ${params.toChain}${
      params.tokenAddress === '0x0000000000000000000000000000000000000000' 
        ? ' (native token)'
        : ` (token: ${params.tokenAddress})`
    }`
}

export async function signActionMessage(
  walletClient: WalletClient,
  action: string,
  params: Record<string, string>
): Promise<string> {
  const message = getSigningMessage(action, params)
  
  const signature = await walletClient.signMessage({
    message,
    account: walletClient.account?.address
  })

  return signature
}

function getSigningMessage(action: string, params: Record<string, string>): string {
  switch (action) {
    case 'stakeTokens':
      return SIGNING_MESSAGES.stakeTokens(params.amount, params.validatorId)
    case 'claimSRewards':
      return SIGNING_MESSAGES.claimSRewards(params.validatorId)
    case 'unstakeSTokens':
      return SIGNING_MESSAGES.unstakeSTokens(params.amount, params.validatorId)
    case 'bridgeTokens':
      return SIGNING_MESSAGES.bridgeTokens(params as any)
    default:
      throw new Error('Unknown action type')
  }
} 