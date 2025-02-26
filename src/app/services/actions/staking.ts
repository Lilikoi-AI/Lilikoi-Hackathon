import { ActionDefinition } from './types';
import { parseEther } from 'viem';
import { stakingHandlers } from './handlers';

export const stakingActions: ActionDefinition[] = [
  {
    name: 'stakeTokens',
    description: 'Stake Sonic (S) tokens to earn rewards',
    parameters: {
      validatorId: 'Validator ID to stake to',
      amount: 'Amount of S tokens to stake',
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