import { ethers } from 'ethers';
import { ETHEREUM_RPC, SONIC_RPC } from '../constants/rpc';

export class GasService {
  private static providers: Record<string, ethers.JsonRpcProvider> = {
    'ETHEREUM': new ethers.JsonRpcProvider(ETHEREUM_RPC),
    'SONIC': new ethers.JsonRpcProvider(SONIC_RPC)
  };

  static async getGasPrice(chain: string, priority: string = 'medium'): Promise<{
    prices: {
      low: string;
      medium: string;
      high: string;
    };
    timestamp: number;
  }> {
    try {
      const provider = this.providers[chain.toUpperCase()];
      if (!provider) {
        throw new Error(`Chain ${chain} not supported`);
      }

      const feeData = await provider.getFeeData();
      const baseGasPrice = feeData.gasPrice || BigInt(0);

      // Calculate different priority levels
      const lowGasPrice = baseGasPrice;
      const mediumGasPrice = (baseGasPrice * BigInt(120)) / BigInt(100); // 20% higher
      const highGasPrice = (baseGasPrice * BigInt(150)) / BigInt(100); // 50% higher

      return {
        prices: {
          low: ethers.formatUnits(lowGasPrice, 'gwei'),
          medium: ethers.formatUnits(mediumGasPrice, 'gwei'),
          high: ethers.formatUnits(highGasPrice, 'gwei')
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching gas price:', error);
      throw error;
    }
  }

  static async estimateGasCost(chain: string, transactionType: string, tokenAmount: string): Promise<{
    estimatedGas: string;
    estimatedCost: {
      usd: string;
      native: string;
    };
  }> {
    try {
      const provider = this.providers[chain.toUpperCase()];
      if (!provider) {
        throw new Error(`Chain ${chain} not supported`);
      }

      // Get current gas price
      const { prices } = await this.getGasPrice(chain, 'medium');
      const gasPrice = ethers.parseUnits(prices.medium, 'gwei');

      // Estimate gas units based on transaction type
      let estimatedGasUnits: bigint;
      switch (transactionType.toLowerCase()) {
        case 'transfer':
          estimatedGasUnits = BigInt(21000); // Standard ETH transfer
          break;
        case 'swap':
          estimatedGasUnits = BigInt(200000); // Average DEX swap
          break;
        case 'bridge':
          estimatedGasUnits = BigInt(300000); // Average bridge transaction
          break;
        case 'stake':
          estimatedGasUnits = BigInt(150000); // Average staking transaction
          break;
        default:
          estimatedGasUnits = BigInt(50000); // Default estimate
      }

      // Calculate total gas cost
      const gasCost = gasPrice * estimatedGasUnits;

      // Get native token price in USD (simplified, you should use PriceService here)
      const nativeTokenPrice = chain.toUpperCase() === 'ETHEREUM' ? 2000 : 1; // Placeholder prices
      const gasCostUSD = Number(ethers.formatEther(gasCost)) * nativeTokenPrice;

      return {
        estimatedGas: estimatedGasUnits.toString(),
        estimatedCost: {
          usd: gasCostUSD.toFixed(2),
          native: ethers.formatEther(gasCost)
        }
      };
    } catch (error) {
      console.error('Error estimating gas cost:', error);
      throw error;
    }
  }

  // In-memory storage for historical gas prices
  private static gasHistory: Record<string, Array<{
    timestamp: number;
    price: string;
  }>> = {};

  static async getGasHistory(chain: string, timeframe: string, interval: string): Promise<{
    history: Array<{
      timestamp: number;
      price: string;
    }>;
  }> {
    try {
      const provider = this.providers[chain.toUpperCase()];
      if (!provider) {
        throw new Error(`Chain ${chain} not supported`);
      }

      // For now, return the cached history or start collecting if not available
      if (!this.gasHistory[chain]) {
        this.gasHistory[chain] = [];
        // Start collecting gas price history
        this.startGasPriceCollection(chain);
      }

      // Filter history based on timeframe
      const now = Date.now();
      const timeframeMs = timeframe === '1h' ? 3600000 :
                         timeframe === '24h' ? 86400000 :
                         timeframe === '7d' ? 604800000 : 3600000;

      return {
        history: this.gasHistory[chain].filter(
          entry => entry.timestamp > now - timeframeMs
        )
      };
    } catch (error) {
      console.error('Error getting gas history:', error);
      throw error;
    }
  }

  private static startGasPriceCollection(chain: string): void {
    const collectGasPrice = async () => {
      try {
        const { prices } = await this.getGasPrice(chain);
        this.gasHistory[chain].push({
          timestamp: Date.now(),
          price: prices.medium
        });

        // Keep only last 7 days of data
        const sevenDaysAgo = Date.now() - 604800000;
        this.gasHistory[chain] = this.gasHistory[chain].filter(
          entry => entry.timestamp > sevenDaysAgo
        );
      } catch (error) {
        console.error('Error collecting gas price:', error);
      }

      // Collect every 5 minutes
      setTimeout(() => collectGasPrice(), 300000);
    };

    // Start collecting
    collectGasPrice();
  }
} 