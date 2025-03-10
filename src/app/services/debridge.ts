import { DeBridgeMessaging } from './debridge/messaging'
import { DeBridgeTokens } from './debridge/tokens'
import { DeBridgeBridge, BridgeParams } from './debridge/bridge'
import { type PublicClient, type WalletClient } from 'viem'
import { parseEther } from 'ethers'

export class DeBridgeService {
  private messaging: DeBridgeMessaging
  private tokens: DeBridgeTokens
  private bridge: DeBridgeBridge
  public sendMessage: typeof DeBridgeMessaging.prototype.sendMessage
  public bridgeToken: typeof DeBridgeTokens.prototype.bridgeToken
  public bridgeWithDeBridge: typeof DeBridgeBridge.prototype.bridgeToken

  constructor(publicClient: PublicClient, walletClient: WalletClient, isTestnet = false) {
    this.messaging = new DeBridgeMessaging(publicClient, walletClient, isTestnet)
    this.tokens = new DeBridgeTokens(publicClient, walletClient, isTestnet)
    this.bridge = new DeBridgeBridge(publicClient, walletClient, isTestnet)
    
    // Bind methods after initialization
    this.sendMessage = this.messaging.sendMessage.bind(this.messaging)
    this.bridgeToken = this.tokens.bridgeToken.bind(this.tokens)
    this.bridgeWithDeBridge = this.bridge.bridgeToken.bind(this.bridge)
  }

  /**
   * Get token address on a specific chain
   * @param chainId Chain ID in deBridge format
   * @param symbol Token symbol
   * @returns Token address or null if not found
   */
  async getTokenAddress(chainId: string, symbol: string): Promise<string | null> {
    const { getTokenAddress } = await import('./actions/debridge-token');
    return getTokenAddress(chainId, symbol);
  }

  /**
   * Convert chain name to deBridge chain ID
   * @param chainName Chain name
   * @returns deBridge chain ID or null if not supported
   */
  async getDebridgeChainId(chainName: string): Promise<string | null> {
    const { getDebridgeChainId } = await import('./actions/debridge-token');
    
    // Special handling for Sonic chain
    if (chainName.toUpperCase() === 'SONIC') {
      console.log('Special handling for Sonic chain in DeBridgeService');
      // For API calls, use the deBridge internal chain ID (100000014)
      return '100000014';
    }
    
    return getDebridgeChainId(chainName);
  }
} 