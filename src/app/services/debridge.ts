import { DeBridgeMessaging } from './debridge/messaging'
import { DeBridgeTokens } from './debridge/tokens'
import { type PublicClient, type WalletClient } from 'viem'

export class DeBridgeService {
  private messaging: DeBridgeMessaging
  private tokens: DeBridgeTokens
  public sendMessage: typeof DeBridgeMessaging.prototype.sendMessage
  public bridgeToken: typeof DeBridgeTokens.prototype.bridgeToken

  constructor(publicClient: PublicClient, walletClient: WalletClient, isTestnet = false) {
    this.messaging = new DeBridgeMessaging(publicClient, walletClient, isTestnet)
    this.tokens = new DeBridgeTokens(publicClient, walletClient, isTestnet)
    
    // Bind methods after initialization
    this.sendMessage = this.messaging.sendMessage.bind(this.messaging)
    this.bridgeToken = this.tokens.bridgeToken.bind(this.tokens)
  }
} 