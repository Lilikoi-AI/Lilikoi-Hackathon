import { type PublicClient, type WalletClient, parseEther, formatEther } from 'viem'
import { sfcAbi } from '../contracts/sfc.abi'
import { STAKING_CONFIG, getValidatorName } from '../config/staking'

export class StakingService {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private contractAddress: string
  private sTokenAddress: string

  constructor(
    publicClient: PublicClient, 
    walletClient: WalletClient,
    contractAddress = STAKING_CONFIG.SFC_CONTRACT,
    sTokenAddress = STAKING_CONFIG.S_TOKEN
  ) {
    this.publicClient = publicClient
    this.walletClient = walletClient
    this.contractAddress = contractAddress
    this.sTokenAddress = sTokenAddress
  }

  async stakeTokens(validatorId: number, amount: string, signature: string) {
    // First approve S tokens if needed
    await this.checkAndApproveTokens(amount)

    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'delegate',
      args: [validatorId],
      value: parseEther(amount),
      account: this.walletClient.account,
      signature
    })

    return await this.walletClient.writeContract(request)
  }

  private async checkAndApproveTokens(amount: string) {
    // Add S token approval logic here if needed
    // This depends on whether the S token requires approval before staking
  }

  async getStakedBalance(address: string, validatorId: number) {
    const delegation = await this.getDelegation(address, validatorId)
    return formatEther(delegation.amount)
  }

  async claimRewards(validatorId: number, signature: string) {
    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'claimRewards',
      args: [validatorId],
      account: this.walletClient.account,
      signature
    })

    return await this.walletClient.writeContract(request)
  }

  async unstake(validatorId: number, amount: string, signature: string) {
    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'undelegate',
      args: [validatorId, parseEther(amount)],
      account: this.walletClient.account,
      signature
    })

    return await this.walletClient.writeContract(request)
  }

  async getValidatorInfo(validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'getValidator',
      args: [validatorId]
    })
  }

  async getDelegation(address: string, validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'getDelegation',
      args: [address, validatorId]
    })
  }

  async getPendingRewards(address: string, validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'pendingRewards',
      args: [address, validatorId]
    })
  }
} 