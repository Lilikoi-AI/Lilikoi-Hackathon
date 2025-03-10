import { type PublicClient, type WalletClient } from 'viem'
import { IDeBridgeGate, ICallProxy } from '@debridge-finance/desdk'
import { 
  DEBRIDGE_CONTRACTS, 
  SUPPORTED_CHAINS,
  getChainId,
  getChainName 
} from '../../config/debridge'
import { ethers } from 'ethers'

// Declare window.ethereum for TypeScript
declare global {
  interface Window {
    ethereum: any;
  }
}

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
    const chainId = getChainId(chainName, this.isTestnet);
    
    // Special handling for Sonic chain
    // When checking if we're on Sonic chain, we need to return 146 (the standard chain ID)
    // instead of 100000014 (the deBridge internal chain ID)
    if (chainName.toUpperCase() === 'SONIC') {
      console.log(`Special handling for Sonic chain: Using standard chain ID 146 instead of deBridge ID ${chainId}`);
      return 146;
    }
    
    return chainId;
  }
  
  // Method to access the wallet client
  protected getWalletClient(): WalletClient {
    return this.walletClient
  }
  
  // Method to access the public client
  protected getPublicClient(): PublicClient {
    return this.publicClient
  }
  
  /**
   * Get ethers provider from the public client
   * @returns Ethers provider
   */
  protected async getProvider(): Promise<ethers.JsonRpcProvider> {
    const chainId = await this.getChainId();
    let rpcUrl: string;
    
    // Determine RPC URL based on chain ID
    if (chainId === 1) {
      // Ethereum mainnet
      rpcUrl = "https://eth-mainnet.g.alchemy.com/v2/RTdxwy09IcN2eTRQHBJw-Ve3_kij5z0O";
    } else if (chainId === 100000014) {
      // Sonic
      rpcUrl = "https://rpc.soniclabs.com";
    } else {
      // Default to public client's RPC URL if available
      const transport = this.publicClient.transport;
      if ('url' in transport) {
        rpcUrl = transport.url;
      } else {
        throw new Error(`No RPC URL available for chain ID ${chainId}`);
      }
    }
    
    return new ethers.JsonRpcProvider(rpcUrl);
  }
  
  /**
   * Get ethers signer from the wallet client
   * @returns Ethers signer
   */
  protected async getSigner(): Promise<ethers.Signer> {
    const provider = await this.getProvider();
    const account = this.walletClient.account;
    
    if (!account) {
      throw new Error('No account connected');
    }
    
    console.log(`Creating signer for account: ${account.address}`);
    
    // Create a wallet client adapter that works with ethers
    return new ethers.BrowserProvider(window.ethereum).getSigner();
  }
} 