import { DeBridgeCore } from './core'

export class DeBridgeTokens extends DeBridgeCore {
  async bridgeToken(params: {
    dstChainId: number,
    token: string,
    amount: string,
    receiver: string,
    useAssetFee?: boolean
  }) {
    const srcChainId = await this.getChainId()
    
    if (!(await this.validateChainSupport(srcChainId)) || 
        !(await this.validateChainSupport(params.dstChainId))) {
      throw new Error('Unsupported chain')
    }

    const contracts = this.getContracts()

    // Bridge parameters
    const bridgeParams = {
      token: params.token,
      amount: params.amount,
      receiver: params.receiver,
      dstChainId: params.dstChainId,
      useAssetFee: params.useAssetFee || true
    }

    try {
      const tx = await this.walletClient.sendTransaction({
        to: contracts.DEBRIDGE_GATE,
        data: '0x...', // Encode bridge function call
        value: params.token === '0x0000000000000000000000000000000000000000' ? params.amount : '0'
      })

      return tx
    } catch (error) {
      console.error('Token bridge error:', error)
      throw error
    }
  }
} 