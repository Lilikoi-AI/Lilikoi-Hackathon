import { type PublicClient, type WalletClient } from 'viem'
import { IDeBridgeGate, ICallProxy } from '@debridge-finance/desdk'
import { 
  DEBRIDGE_CONTRACTS, 
  SUPPORTED_CHAINS,
  getChainId,
  getChainName 
} from '../../config/debridge'

export class DeBridgeCore {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private isTestnet: boolean

  constructor(publicClient: PublicClient, walletClient: WalletClient, isTestnet = false) {
    this.publicClient = publicClient
    this.walletClient = walletClient
    this.isTestnet = isTestnet
  }

  protected getContracts() {
    return this.isTestnet ? DEBRIDGE_CONTRACTS.TESTNET : DEBRIDGE_CONTRACTS.MAINNET
  }

  protected async getChainId(): Promise<number> {
    return await this.publicClient.getChainId()
  }

  protected async validateChainSupport(chainId: number): Promise<boolean> {
    const networks = this.isTestnet ? SUPPORTED_CHAINS.TESTNET : SUPPORTED_CHAINS.MAINNET
    return Object.values(networks).some(chain => chain.id === chainId)
  }

  protected getChainConfig() {
    return this.isTestnet ? SUPPORTED_CHAINS.TESTNET : SUPPORTED_CHAINS.MAINNET
  }

  protected getChainName(chainId: number): string | null {
    return getChainName(chainId, this.isTestnet)
  }

  protected getChainById(chainName: string): number | null {
    return getChainId(chainName, this.isTestnet)
  }
} 