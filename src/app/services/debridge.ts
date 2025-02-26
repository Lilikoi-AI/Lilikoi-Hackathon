import { DeBridgeMessaging } from './debridge/messaging'
import { DeBridgeTokens } from './debridge/tokens'
import { type PublicClient, type WalletClient } from 'viem'
import { parseEther } from 'ethers'

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

  async bridgeTokens({
    fromChainId,
    toChainId,
    tokenAddress,
    amount,
    signature
  }: {
    fromChainId: number;
    toChainId: number;
    tokenAddress: string;
    amount: string;
    signature: string;
  }) {
    await this.validateChainSupport(fromChainId);
    await this.validateChainSupport(toChainId);

    const contracts = this.getContracts();
    if (!contracts) {
      throw new Error('Contracts not found for chain');
    }

    const { request } = await this.publicClient.simulateContract({
      address: contracts.DEBRIDGE_GATE,
      abi: debridgeAbi,
      functionName: 'send',
      args: [
        tokenAddress,
        parseEther(amount),
        toChainId,
        this.walletClient.account?.address || '0x',
        '0x'
      ],
      account: this.walletClient.account,
      signature
    });

    return await this.walletClient.writeContract(request);
  }
} 