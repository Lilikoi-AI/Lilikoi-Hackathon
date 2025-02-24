import { useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { DeBridgeService } from '../services/debridge'

export function useDebridge() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCrossChainMessage = async (
    fromChainId: number,
    toChainId: number,
    message: string,
    receiverAddress: string
  ) => {
    if (!walletClient || !publicClient) {
      setError('Wallet not connected')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const debridge = new DeBridgeService(publicClient, walletClient)
      const tx = await debridge.sendMessage({
        dstChainId: toChainId,
        message,
        receiver: receiverAddress
      })
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const bridgeTokens = async (params: {
    fromChainId: number;
    toChainId: number;
    tokenAddress: string;
    amount: string;
    receiverAddress: string;
  }) => {
    if (!walletClient || !publicClient) {
      setError('Wallet not connected')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const debridge = new DeBridgeService(publicClient, walletClient)
      const tx = await debridge.bridgeToken({
        dstChainId: params.toChainId,
        token: params.tokenAddress,
        amount: params.amount,
        receiver: params.receiverAddress
      })
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const getBridgeFee = async (fromChainId: number, toChainId: number) => {
    if (!publicClient) {
      setError('Provider not available')
      return
    }

    try {
      const debridge = new DeBridgeService(publicClient, walletClient)
      return await debridge.getBridgeFee(fromChainId, toChainId)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    bridgeTokens,
    sendCrossChainMessage,
    getBridgeFee,
    isLoading,
    error
  }
} 