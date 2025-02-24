import { ActionDefinition } from './types';
import { DEBRIDGE_CONFIG, DEBRIDGE_TESTNET_CONFIG } from '../../config/debridge';

export const debridgeActions: ActionDefinition[] = [
  {
    name: 'bridgeTokens',
    description: `Bridge tokens between supported chains (${Object.keys(DEBRIDGE_CONFIG.CHAINS).join(', ')})`,
    parameters: {
      fromChain: 'Source chain (ETHEREUM, BSC, ARBITRUM, BASE)',
      toChain: 'Destination chain',
      amount: 'Amount to bridge',
      tokenAddress: 'Token contract address (required, use 0x0000000000000000000000000000000000000000 for native token)'
    },
    validate: (params) => {
      const supportedChains = Object.keys(DEBRIDGE_CONFIG.CHAINS);
      return {
        isValid: 
          supportedChains.includes(params.fromChain) && 
          supportedChains.includes(params.toChain) &&
          parseFloat(params.amount) > 0 &&
          params.tokenAddress,
        error: !supportedChains.includes(params.fromChain) || !supportedChains.includes(params.toChain) 
          ? `Unsupported chain. Supported chains: ${supportedChains.join(', ')}` 
          : !params.tokenAddress
          ? 'Token address is required'
          : parseFloat(params.amount) <= 0 
          ? 'Invalid amount'
          : null
      };
    }
  },
  {
    name: 'crossChainMessage',
    description: 'Send a message across chains using deBridge protocol',
    parameters: {
      fromChain: 'Source chain',
      toChain: 'Destination chain',
      message: 'Message to send',
      receiverAddress: 'Receiver contract address'
    },
    validate: (params) => {
      const supportedChains = Object.keys(DEBRIDGE_CONFIG.CHAINS);
      return {
        isValid: 
          supportedChains.includes(params.fromChain) && 
          supportedChains.includes(params.toChain) &&
          params.message?.length > 0 &&
          /^0x[a-fA-F0-9]{40}$/.test(params.receiverAddress),
        error: !params.message 
          ? 'Message required' 
          : !/^0x[a-fA-F0-9]{40}$/.test(params.receiverAddress)
          ? 'Invalid receiver address'
          : null
      };
    }
  }
]; 