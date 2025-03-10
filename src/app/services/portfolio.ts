import { ethers } from 'ethers';
import { PriceService } from './price';
import { fetchWalletTokens } from './actions/api';
import { DEBRIDGE_CHAIN_IDS } from './actions/debridge-token';

interface Asset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  chain: string;
  type: 'token' | 'lp' | 'staked';
  protocol?: string;
}

interface PortfolioMetrics {
  totalValue: string;
  performance: {
    '24h': string;
    '7d': string;
    '30d': string;
  };
  diversificationScore: string;
  riskLevel: 'low' | 'moderate' | 'high';
}

export class PortfolioService {
  // In-memory cache for portfolio data
  private static portfolioCache: Record<string, {
    assets: Asset[];
    lastUpdated: number;
    metrics: PortfolioMetrics;
  }> = {};

  static async getPortfolioOverview(walletAddress: string, currency: string = 'USD'): Promise<{
    totalValue: string;
    assets: Asset[];
    performance: {
      '24h': string;
      '7d': string;
      '30d': string;
    };
  }> {
    try {
      // Check cache first (5 minute validity)
      const cached = this.portfolioCache[walletAddress];
      if (cached && Date.now() - cached.lastUpdated < 300000) {
        return {
          totalValue: cached.metrics.totalValue,
          assets: cached.assets,
          performance: cached.metrics.performance
        };
      }

      // Fetch tokens from all supported chains
      const assets: Asset[] = [];
      for (const [chainName, chainId] of Object.entries(DEBRIDGE_CHAIN_IDS)) {
        const tokens = await fetchWalletTokens(walletAddress, chainId);
        
        // Get price for each token
        for (const token of tokens) {
          try {
            const { price } = await PriceService.getTokenPrice(token.symbol, currency.toLowerCase());
            const value = (parseFloat(token.balance) * parseFloat(price)).toString();
            
            assets.push({
              symbol: token.symbol,
              name: token.name,
              balance: token.balance,
              value,
              chain: chainName,
              type: 'token'
            });
          } catch (error) {
            console.warn(`Could not get price for ${token.symbol}:`, error);
            // Add token without value
            assets.push({
              symbol: token.symbol,
              name: token.name,
              balance: token.balance,
              value: '0',
              chain: chainName,
              type: 'token'
            });
          }
        }
      }

      // Calculate total value and basic metrics
      const totalValue = assets.reduce(
        (sum, asset) => sum + parseFloat(asset.value),
        0
      ).toString();

      const metrics: PortfolioMetrics = {
        totalValue,
        performance: {
          '24h': '0.00%',
          '7d': '0.00%',
          '30d': '0.00%'
        },
        diversificationScore: this.calculateDiversificationScore(assets),
        riskLevel: this.assessRiskLevel(assets)
      };

      // Update cache
      this.portfolioCache[walletAddress] = {
        assets,
        lastUpdated: Date.now(),
        metrics
      };

      return {
        totalValue,
        assets,
        performance: metrics.performance
      };
    } catch (error) {
      console.error('Error getting portfolio overview:', error);
      throw error;
    }
  }

  static async getAssetAllocation(walletAddress: string, groupBy: string = 'chain'): Promise<{
    distribution: Record<string, string>;
    metrics: {
      diversificationScore: string;
      riskLevel: string;
    };
  }> {
    try {
      // Get portfolio data
      const { assets } = await this.getPortfolioOverview(walletAddress);
      
      // Calculate distribution based on groupBy parameter
      const groups: Record<string, number> = {};
      const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);

      assets.forEach(asset => {
        const key = groupBy === 'chain' ? asset.chain :
                   groupBy === 'type' ? asset.type :
                   groupBy === 'protocol' ? (asset.protocol || 'other') :
                   'other';
        
        groups[key] = (groups[key] || 0) + parseFloat(asset.value);
      });

      // Convert to percentages
      const distribution: Record<string, string> = {};
      Object.entries(groups).forEach(([key, value]) => {
        distribution[key] = ((value / totalValue) * 100).toFixed(2) + '%';
      });

      return {
        distribution,
        metrics: {
          diversificationScore: this.calculateDiversificationScore(assets),
          riskLevel: this.assessRiskLevel(assets)
        }
      };
    } catch (error) {
      console.error('Error getting asset allocation:', error);
      throw error;
    }
  }

  private static calculateDiversificationScore(assets: Asset[]): string {
    // Simple diversification score based on:
    // 1. Number of different assets
    // 2. Distribution across chains
    // 3. Distribution across asset types
    
    const uniqueAssets = new Set(assets.map(a => a.symbol)).size;
    const uniqueChains = new Set(assets.map(a => a.chain)).size;
    const uniqueTypes = new Set(assets.map(a => a.type)).size;

    const score = (
      (Math.min(uniqueAssets, 10) / 10) * 0.4 +
      (Math.min(uniqueChains, 5) / 5) * 0.3 +
      (Math.min(uniqueTypes, 3) / 3) * 0.3
    ) * 100;

    return score.toFixed(2);
  }

  private static assessRiskLevel(assets: Asset[]): 'low' | 'moderate' | 'high' {
    // Simple risk assessment based on:
    // 1. Concentration in volatile assets
    // 2. Diversification score
    // 3. Stablecoin ratio

    const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
    const stablecoins = assets.filter(a => 
      ['USDC', 'USDT', 'DAI', 'USDC.e'].includes(a.symbol.toUpperCase())
    );
    const stablecoinRatio = stablecoins.reduce(
      (sum, asset) => sum + parseFloat(asset.value),
      0
    ) / totalValue;

    const diversificationScore = parseFloat(this.calculateDiversificationScore(assets));

    if (stablecoinRatio > 0.7 && diversificationScore > 70) {
      return 'low';
    } else if (stablecoinRatio < 0.3 && diversificationScore < 50) {
      return 'high';
    } else {
      return 'moderate';
    }
  }

  static async getInvestmentSuggestions(
    walletAddress: string,
    riskLevel: string,
    investmentAmount?: string
  ): Promise<{
    suggestions: Array<{
      asset: string;
      amount: string;
      reason: string;
    }>;
    expectedReturns: {
      conservative: string;
      moderate: string;
      aggressive: string;
    };
  }> {
    try {
      // Get current portfolio
      const { assets, totalValue } = await this.getPortfolioOverview(walletAddress);
      
      // Generate suggestions based on:
      // 1. Current portfolio composition
      // 2. Desired risk level
      // 3. Investment amount
      // 4. Market conditions (would need external data)

      const suggestions = [];
      const currentRiskLevel = this.assessRiskLevel(assets);

      if (riskLevel === 'low') {
        suggestions.push({
          asset: 'USDC',
          amount: '40%',
          reason: 'Stable value and low risk'
        });
        suggestions.push({
          asset: 'S',
          amount: '30%',
          reason: 'Platform token with staking rewards'
        });
        suggestions.push({
          asset: 'ETH',
          amount: '30%',
          reason: 'Blue chip crypto asset'
        });
      } else if (riskLevel === 'moderate') {
        suggestions.push({
          asset: 'ETH',
          amount: '40%',
          reason: 'Strong fundamentals and growth potential'
        });
        suggestions.push({
          asset: 'S',
          amount: '40%',
          reason: 'High staking yields and platform growth'
        });
        suggestions.push({
          asset: 'USDC',
          amount: '20%',
          reason: 'Stability buffer'
        });
      } else {
        suggestions.push({
          asset: 'S',
          amount: '60%',
          reason: 'Maximum exposure to platform growth'
        });
        suggestions.push({
          asset: 'ETH',
          amount: '30%',
          reason: 'Market leader with high liquidity'
        });
        suggestions.push({
          asset: 'USDC',
          amount: '10%',
          reason: 'Minimum stability buffer'
        });
      }

      return {
        suggestions,
        expectedReturns: {
          conservative: '5-10%',
          moderate: '10-20%',
          aggressive: '20-40%'
        }
      };
    } catch (error) {
      console.error('Error getting investment suggestions:', error);
      throw error;
    }
  }
} 