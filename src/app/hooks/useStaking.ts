import { useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { StakingService } from '../services/staking'
import { STAKING_CONFIG } from '../config/staking'
import { signActionMessage } from '../utils/signing'

export function useStaking() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stakeTokens = async (validatorId: number, amount: string) => {
    if (!walletClient || !publicClient) {
      setError('Wallet not connected')
      return
    }

    if (parseFloat(amount) < parseFloat(STAKING_CONFIG.MIN_STAKE)) {
      setError(`Minimum stake amount is ${STAKING_CONFIG.MIN_STAKE} S tokens`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const staking = new StakingService(publicClient, walletClient)
      
      // Get signature first
      let signature
      try {
        signature = await signActionMessage(walletClient, 'stakeTokens', {
          validatorId: validatorId.toString(),
          amount
        })
      } catch (err) {
        if (err.code === 4001) { // User rejected request
          setError('User rejected signature request')
          return
        }
        throw err
      }

      const tx = await staking.stakeTokens(validatorId, amount, signature)
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const claimRewards = async (validatorId: number) => {
    if (!walletClient || !publicClient) {
      setError('Wallet not connected')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const staking = new StakingService(publicClient, walletClient)
      const tx = await staking.claimRewards(validatorId)
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    stakeTokens,
    claimRewards,
    isLoading,
    error
  }
} 