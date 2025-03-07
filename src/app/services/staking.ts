import { PublicClient, WalletClient, parseEther, formatEther } from 'viem'
import { sfcAbi } from '../contracts/sfc.abi'
import { STAKING_CONFIG, getValidatorName } from '../config/staking'

export class StakingService {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private contractAddress: `0x${string}`
  private sTokenAddress: string

  constructor(
    publicClient: PublicClient, 
    walletClient: WalletClient,
    contractAddress = STAKING_CONFIG.SFC_CONTRACT,
    sTokenAddress = STAKING_CONFIG.S_TOKEN
  ) {
    this.publicClient = publicClient
    this.walletClient = walletClient
    this.contractAddress = contractAddress as `0x${string}`
    this.sTokenAddress = sTokenAddress
  }

  async stakeTokens(validatorId: number, amount: string) {
    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.contractAddress,
        abi: sfcAbi,
        functionName: 'delegate',
        args: [BigInt(validatorId)],
        value: parseEther(amount),
        account: this.walletClient.account
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Delegation failed:', error)
      throw error
    }
  }

  private async checkAndApproveTokens(amount: string) {
    // Add S token approval logic here if needed
    // This depends on whether the S token requires approval before staking
  }

  async getStakedBalance(address: `0x${string}`, validatorId: number) {
    const stake = await this.getStake(address, validatorId)
    return formatEther(stake)
  }

  async claimRewards(validatorId: number) {
    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'claimRewards',
      args: [BigInt(validatorId)],
      account: this.walletClient.account
    })

    return await this.walletClient.writeContract(request)
  }

  async unstake(validatorId: number, amount: string) {
    // Get next wrID
    const wrID = await this.getNextWrID(this.walletClient.account?.address as `0x${string}`, validatorId)

    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'undelegate',
      args: [BigInt(validatorId), BigInt(wrID), parseEther(amount)],
      account: this.walletClient.account
    })

    return await this.walletClient.writeContract(request)
  }

  private async getNextWrID(delegator: `0x${string}`, validatorId: number) {
    let wrID = 0
    while (true) {
      const request = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: sfcAbi,
        functionName: 'getWithdrawalRequest',
        args: [delegator, BigInt(validatorId), BigInt(wrID)]
      })

      // Check if the withdrawal request exists
      const amount = (request as any)[0] as bigint
      if (amount === BigInt(0)) {
        return wrID
      }
      wrID++
    }
  }

  async getValidatorInfo(validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'getValidator',
      args: [BigInt(validatorId)]
    })
  }

  async getStake(address: `0x${string}`, validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'getStake',
      args: [address, BigInt(validatorId)]
    })
  }

  async getCurrentEpoch() {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'currentEpoch',
      args: []
    })
  }

  async getEpochValidatorIDs(epoch: bigint) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'getEpochValidatorIDs',
      args: [epoch]
    })
  }

  async getPendingRewards(address: `0x${string}`, validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'pendingRewards',
      args: [address, BigInt(validatorId)]
    })
  }

  async getLastValidatorID() {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'lastValidatorID',
      args: []
    })
  }

  async getValidator(validatorId: number) {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: sfcAbi,
      functionName: 'getValidator',
      args: [BigInt(validatorId)]
    })
  }
} 