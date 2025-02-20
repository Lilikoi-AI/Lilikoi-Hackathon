import { DeBridgeSDK, ChainId, TokenInfo } from '@debridge-finance/debridge-sdk-js';
import { SUPPORTED_CHAINS } from '../../config/constants';

interface BridgeQuote {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedGas: string;
  bridgeFee: string;
  estimatedTime: string;
}

interface BridgeTransaction {
  txHash: string;
  status: string;
  fromChain: string;
  toChain: string;
  amount: string;
  estimatedCompletionTime: string;
}

export class DeBridgeService {
  private sdk: DeBridgeSDK;

  constructor() {
    this.sdk = new DeBridgeSDK({
      chainId: ChainId.ETH_MAINNET,
      provider: window.ethereum // or your provider
    });
  }

  async getQuote(
    fromChain: string,
    toChain: string,
    tokenAddress: string,
    amount: string
  ): Promise<any> {
    try {
      const quote = await this.sdk.getQuote({
        srcChainId: SUPPORTED_CHAINS[fromChain].id,
        dstChainId: SUPPORTED_CHAINS[toChain].id,
        srcTokenAddress: tokenAddress,
        dstTokenAddress: tokenAddress, // or destination token address
        amount: amount
      });

      return quote;
    } catch (error) {
      console.error('Error getting bridge quote:', error);
      throw error;
    }
  }

  async initiateBridge(
    quote: BridgeQuote,
    walletAddress: string
  ): Promise<BridgeTransaction> {
    try {
      const response = await axios.post(
        `${DEBRIDGE_API_BASE_URL}/bridge`,
        {
          quoteId: quote.quoteId,
          fromAddress: walletAddress,
          toAddress: walletAddress
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: API_TIMEOUT
        }
      );

      return {
        txHash: response.data.txHash,
        status: 'pending',
        fromChain: quote.fromChain,
        toChain: quote.toChain,
        amount: quote.amount,
        estimatedCompletionTime: response.data.estimatedCompletionTime
      };
    } catch (error) {
      console.error('Error initiating bridge:', error);
      throw new Error('Failed to initiate bridge transaction');
    }
  }

  async getBridgeStatus(txHash: string): Promise<BridgeTransaction> {
    try {
      const response = await axios.get(
        `${DEBRIDGE_API_BASE_URL}/status/${txHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: API_TIMEOUT
        }
      );

      return {
        txHash,
        status: response.data.status,
        fromChain: response.data.fromChain,
        toChain: response.data.toChain,
        amount: response.data.amount,
        estimatedCompletionTime: response.data.estimatedCompletionTime
      };
    } catch (error) {
      console.error('Error getting bridge status:', error);
      throw new Error('Failed to get bridge status');
    }
  }
} 