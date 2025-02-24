import { DeBridgeCore } from './core'

export class DeBridgeMessaging extends DeBridgeCore {
  async sendMessage(params: {
    dstChainId: number,
    message: string,
    receiver: string,
    executionFee?: string,
    flags?: number
  }) {
    const srcChainId = await this.getChainId()
    
    if (!(await this.validateChainSupport(srcChainId)) || 
        !(await this.validateChainSupport(params.dstChainId))) {
      throw new Error('Unsupported chain')
    }

    const contracts = this.getContracts()
    
    // Prepare submission parameters
    const submissionParams = {
      dstChainId: params.dstChainId,
      message: params.message,
      receiver: params.receiver,
      executionFee: params.executionFee || '0',
      flags: params.flags || 0
    }

    // Send transaction
    try {
      const tx = await this.walletClient.sendTransaction({
        to: contracts.DEBRIDGE_GATE,
        data: '0x...', // Encode function call
        value: submissionParams.executionFee
      })

      return tx
    } catch (error) {
      console.error('Message sending error:', error)
      throw error
    }
  }
} 