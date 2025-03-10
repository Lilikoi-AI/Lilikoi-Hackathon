import { ActionDefinition } from './types';
import { GasService } from '../gas';

export const gasActions: ActionDefinition[] = [
  {
    name: 'getGasPrice',
    description: 'Get current gas prices for a specific chain',
    parameters: {
      chain: 'Chain name (e.g., ethereum, sonic)',
      priority: 'Priority level (low, medium, high)'
    },
    validate: (params) => ({
      isValid: !!params.chain,
      error: !params.chain ? 'Chain name is required' : null
    }),
    handler: async (params) => {
      try {
        const { gasPrice, gweiPrice, usdPrice } = await GasService.getGasPrice(
          params.chain.toLowerCase(),
          params.priority?.toLowerCase() || 'medium'
        );

        return {
          type: 'GAS_PRICE',
          data: {
            chain: params.chain,
            priority: params.priority || 'medium',
            gasPrice,
            gweiPrice,
            usdPrice
          },
          message: `Current gas price on ${params.chain}: ${gweiPrice} Gwei (${usdPrice} USD)`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting gas price for ${params.chain}: ${error.message}`
        };
      }
    }
  },
  {
    name: 'estimateGasCost',
    description: 'Estimate gas cost for a transaction',
    parameters: {
      chain: 'Chain name',
      type: 'Transaction type (transfer, swap, bridge, stake)',
      amount: 'Token amount (optional)',
      token: 'Token symbol (optional)'
    },
    validate: (params) => ({
      isValid: !!params.chain && !!params.type,
      error: !params.chain ? 'Chain name is required' : !params.type ? 'Transaction type is required' : null
    }),
    handler: async (params) => {
      try {
        const { gasLimit, gasCost, usdCost } = await GasService.estimateGasCost(
          params.chain.toLowerCase(),
          params.type.toLowerCase(),
          params.amount,
          params.token
        );

        return {
          type: 'GAS_ESTIMATE',
          data: {
            chain: params.chain,
            type: params.type,
            gasLimit,
            gasCost,
            usdCost
          },
          message: `Estimated gas cost for ${params.type} on ${params.chain}: ${gasCost} (${usdCost} USD)`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error estimating gas cost: ${error.message}`
        };
      }
    }
  },
  {
    name: 'getGasHistory',
    description: 'Get historical gas prices',
    parameters: {
      chain: 'Chain name',
      timeframe: 'Time period (1h, 24h, 7d)',
      priority: 'Priority level (low, medium, high)'
    },
    validate: (params) => ({
      isValid: !!params.chain && !!params.timeframe,
      error: !params.chain ? 'Chain name is required' : !params.timeframe ? 'Timeframe is required' : null
    }),
    handler: async (params) => {
      try {
        const { prices, timestamps } = await GasService.getGasHistory(
          params.chain.toLowerCase(),
          params.timeframe,
          params.priority?.toLowerCase() || 'medium'
        );

        return {
          type: 'GAS_HISTORY',
          data: {
            chain: params.chain,
            timeframe: params.timeframe,
            priority: params.priority || 'medium',
            history: prices,
            timestamps
          },
          message: `Gas price history for ${params.chain} over ${params.timeframe}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting gas price history: ${error.message}`
        };
      }
    }
  }
]; 