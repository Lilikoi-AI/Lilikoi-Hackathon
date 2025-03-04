import { ActionDefinition } from './types';
import { parseEther } from 'viem';
import { stakingHandlers } from './handlers';
import { handleValidatorsList } from './handlers';
import { STAKING_CONFIG } from '../../config/staking';

export const stakingActions: ActionDefinition[] = [
  {
    name: 'getValidatorsList',
    description: 'Get list of available Sonic validators with their stats',
    parameters: {},
    validate: () => ({
      isValid: true,
      error: null
    }),
    handler: async () => handleValidatorsList()
  },
  {
    name: 'stakeTokens',
    description: 'Stake Sonic (S) tokens with a validator to earn rewards',
    parameters: {
      validatorId: 'The ID number of the validator to stake with',
      amount: 'Amount of S tokens to stake (minimum 100 S)',
    },
    validate: (params: Record<string, any>) => {
      const amount = parseFloat(params.amount as string);
      const validatorId = parseInt(params.validatorId as string);
      const minStake = parseFloat(STAKING_CONFIG.MIN_STAKE);

      if (isNaN(amount) || amount <= 0) {
        return {
          isValid: false,
          error: 'Please specify a valid amount of S tokens to stake'
        };
      }

      if (amount < minStake) {
        return {
          isValid: false,
          error: `Minimum stake amount is ${minStake} S tokens`
        };
      }

      if (isNaN(validatorId) || validatorId <= 0) {
        return {
          isValid: false,
          error: 'Please specify a valid validator ID'
        };
      }

      return {
        isValid: true,
        error: null
      };
    },
    handler: stakingHandlers.stakeTokens
  },
  {
    name: 'claimSRewards',
    description: 'Claim Sonic (S) staking rewards from a validator',
    parameters: {
      validatorId: 'Validator ID to claim S token rewards from'
    },
    validate: (params) => {
      const validatorId = parseInt(params.validatorId);
      return {
        isValid: !isNaN(validatorId) && validatorId > 0,
        error: 'Invalid validator ID'
      };
    },
    handler: stakingHandlers.claimSRewards
  },
  {
    name: 'unstakeSTokens',
    description: 'Unstake Sonic (S) tokens from a validator',
    parameters: {
      validatorId: 'Validator ID to unstake from',
      amount: 'Amount of S tokens to unstake'
    },
    validate: (params) => {
      const amount = parseFloat(params.amount);
      const validatorId = parseInt(params.validatorId);
      return {
        isValid: 
          !isNaN(amount) && 
          amount > 0 && 
          !isNaN(validatorId) && 
          validatorId > 0,
        error: isNaN(amount) || amount <= 0 
          ? 'Invalid S token amount' 
          : isNaN(validatorId) || validatorId <= 0
          ? 'Invalid validator ID'
          : null
      };
    },
    handler: stakingHandlers.unstakeSTokens
  }
]; 