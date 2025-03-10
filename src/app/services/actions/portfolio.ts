import { ActionDefinition } from './types';
import { PortfolioService } from '../portfolio';

export const portfolioActions: ActionDefinition[] = [
  {
    name: 'getPortfolioOverview',
    description: 'Get an overview of your portfolio including total value and performance metrics',
    parameters: {
      address: 'Wallet address to check portfolio for',
      currency: 'Currency to show values in (default: USD)'
    },
    validate: (params) => ({
      isValid: !!params.address,
      error: !params.address ? 'Wallet address is required' : null
    }),
    handler: async (params) => {
      try {
        const { totalValue, assets, metrics } = await PortfolioService.getPortfolioOverview(
          params.address,
          params.currency?.toLowerCase() || 'usd'
        );

        return {
          type: 'PORTFOLIO_OVERVIEW',
          data: {
            address: params.address,
            totalValue,
            assets,
            metrics
          },
          message: `Portfolio Overview:\nTotal Value: ${totalValue} ${params.currency || 'USD'}\nAssets: ${assets.length}\nPerformance (24h): ${metrics.performance24h}%`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting portfolio overview: ${error.message}`
        };
      }
    }
  },
  {
    name: 'getAssetAllocation',
    description: 'Get detailed breakdown of asset allocation in your portfolio',
    parameters: {
      address: 'Wallet address',
      groupBy: 'How to group assets (chain, type, protocol)',
      currency: 'Currency to show values in (default: USD)'
    },
    validate: (params) => ({
      isValid: !!params.address && !!params.groupBy,
      error: !params.address ? 'Wallet address is required' : !params.groupBy ? 'Grouping criteria is required' : null
    }),
    handler: async (params) => {
      try {
        const allocation = await PortfolioService.getAssetAllocation(
          params.address,
          params.groupBy.toLowerCase(),
          params.currency?.toLowerCase() || 'usd'
        );

        return {
          type: 'ASSET_ALLOCATION',
          data: {
            address: params.address,
            groupBy: params.groupBy,
            allocation
          },
          message: `Asset Allocation by ${params.groupBy}:\n${Object.entries(allocation)
            .map(([key, value]) => `${key}: ${value.percentage}% (${value.value} ${params.currency || 'USD'})`)
            .join('\n')}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting asset allocation: ${error.message}`
        };
      }
    }
  },
  {
    name: 'getInvestmentSuggestions',
    description: 'Get personalized investment suggestions based on your portfolio',
    parameters: {
      address: 'Wallet address',
      riskLevel: 'Desired risk level (low, medium, high)',
      currency: 'Currency to show values in (default: USD)'
    },
    validate: (params) => ({
      isValid: !!params.address && !!params.riskLevel,
      error: !params.address ? 'Wallet address is required' : !params.riskLevel ? 'Risk level is required' : null
    }),
    handler: async (params) => {
      try {
        const { diversificationScore, riskLevel, suggestions } = await PortfolioService.getInvestmentSuggestions(
          params.address,
          params.riskLevel.toLowerCase(),
          params.currency?.toLowerCase() || 'usd'
        );

        return {
          type: 'INVESTMENT_SUGGESTIONS',
          data: {
            address: params.address,
            diversificationScore,
            riskLevel,
            suggestions
          },
          message: `Investment Suggestions:\nDiversification Score: ${diversificationScore}/100\nCurrent Risk Level: ${riskLevel}\n\nSuggestions:\n${suggestions.map(s => `- ${s}`).join('\n')}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting investment suggestions: ${error.message}`
        };
      }
    }
  }
]; 