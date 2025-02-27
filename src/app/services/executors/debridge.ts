/* eslint-disable @typescript-eslint/no-explicit-any */
import { DeBridgeService } from '../debridge';
import { DEBRIDGE_CONFIG } from '../../config/debridge';
import { ethers } from 'ethers';

export class DeBridgeExecutor {
  private deBridgeService: DeBridgeService;

  constructor(provider: any, signer: any) {
    this.deBridgeService = new DeBridgeService(provider, signer);
  }

  async executeBridgeTokens(params: {
    fromChain: string;
    toChain: string;
    amount: string;
    tokenAddress?: string;
  }) {
    const fromChainId = DEBRIDGE_CONFIG.CHAINS[params.fromChain];
    const toChainId = DEBRIDGE_CONFIG.CHAINS[params.toChain];

    if (!fromChainId || !toChainId) {
      throw new Error('Unsupported chain');
    }

    // Execute bridge transaction
    const tx = await this.deBridgeService.sendCrossChainMessage(
      fromChainId,
      toChainId,
      JSON.stringify({ type: 'BRIDGE', amount: params.amount, token: params.tokenAddress }),
      params.tokenAddress || ethers.ZeroAddress
    );

    return {
      txHash: tx.hash,
      fromChain: params.fromChain,
      toChain: params.toChain,
      amount: params.amount
    };
  }

  async executeCrossChainMessage(params: {
    fromChain: string;
    toChain: string;
    message: string;
    receiverAddress: string;
  }) {
    const fromChainId = DEBRIDGE_CONFIG.CHAINS[params.fromChain];
    const toChainId = DEBRIDGE_CONFIG.CHAINS[params.toChain];

    if (!fromChainId || !toChainId) {
      throw new Error('Unsupported chain');
    }

    const tx = await this.deBridgeService.sendCrossChainMessage(
      fromChainId,
      toChainId,
      params.message,
      params.receiverAddress
    );

    return {
      txHash: tx.hash,
      fromChain: params.fromChain,
      toChain: params.toChain,
      receiverAddress: params.receiverAddress
    };
  }
} 