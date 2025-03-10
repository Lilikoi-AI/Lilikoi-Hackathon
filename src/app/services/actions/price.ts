import { ActionDefinition } from './types';
import { PriceService } from '../price';

export const priceActions: ActionDefinition[] = [
  {
    name: 'getTokenPrice',
    description: 'Get current price of a token in USD or other specified currency',
    parameters: {
      tokenSymbol: 'Symbol of the token (e.g., S, USDC, ETH)',
      currency: 'Currency to show price in (default: USD)'
    },
    validate: (params) => ({
      isValid: !!params.tokenSymbol,
      error: !params.tokenSymbol ? 'Token symbol is required' : null
    }),
    handler: async (params) => {
      try {
        const { price, timestamp, change24h } = await PriceService.getTokenPrice(
          params.tokenSymbol,
          params.currency?.toLowerCase() || 'usd'
        );

        return {
          type: 'TOKEN_PRICE',
          data: {
            token: params.tokenSymbol,
            currency: params.currency || 'USD',
            price,
            timestamp,
            change24h
          },
          message: `Current price of ${params.tokenSymbol}: ${price} ${params.currency || 'USD'} (24h change: ${change24h || '0.00'}%)`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting price for ${params.tokenSymbol}: ${error.message}`
        };
      }
    }
  },
  {
    name: 'getPriceHistory',
    description: 'Get historical price data for a token',
    parameters: {
      tokenSymbol: 'Symbol of the token',
      timeframe: 'Time period (1h, 24h, 7d, 30d)',
      interval: 'Data interval (1m, 5m, 15m, 1h, 1d)'
    },
    validate: (params) => ({
      isValid: !!params.tokenSymbol && !!params.timeframe,
      error: !params.tokenSymbol ? 'Token symbol is required' : !params.timeframe ? 'Timeframe is required' : null
    }),
    handler: async (params) => {
      try {
        const { prices, timestamps } = await PriceService.getPriceHistory(
          params.tokenSymbol,
          params.timeframe,
          params.interval || '1h'
        );

        return {
          type: 'PRICE_HISTORY',
          data: {
            token: params.tokenSymbol,
            timeframe: params.timeframe,
            interval: params.interval,
            history: prices,
            timestamps
          },
          message: `Price history for ${params.tokenSymbol} over ${params.timeframe}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting price history for ${params.tokenSymbol}: ${error.message}`
        };
      }
    }
  },
  {
    name: 'setPriceAlert',
    description: 'Set a price alert for a token',
    parameters: {
      tokenSymbol: 'Symbol of the token',
      condition: 'above or below',
      price: 'Target price for the alert',
      currency: 'Currency for the price (default: USD)'
    },
    validate: (params) => ({
      isValid: !!params.tokenSymbol && !!params.condition && !!params.price,
      error: !params.tokenSymbol ? 'Token symbol is required' : 
             !params.condition ? 'Condition is required' : 
             !params.price ? 'Price is required' : null
    }),
    handler: async (params) => {
      try {
        PriceService.setPriceAlert(
          params.tokenSymbol,
          params.condition as 'above' | 'below',
          params.price,
          params.currency?.toLowerCase() || 'usd'
        );

        return {
          type: 'PRICE_ALERT',
          data: {
            token: params.tokenSymbol,
            condition: params.condition,
            price: params.price,
            currency: params.currency || 'USD'
          },
          message: `Price alert set: ${params.tokenSymbol} ${params.condition} ${params.price} ${params.currency || 'USD'}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error setting price alert: ${error.message}`
        };
      }
    }
  }
]; 