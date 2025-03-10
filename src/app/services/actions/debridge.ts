import { ActionDefinition } from './types';
import { DEBRIDGE_CONFIG, DEBRIDGE_TESTNET_CONFIG } from '../../config/debridge';
import { signActionMessage } from '../../utils/signing';
import { DeBridgeService } from '../../services/debridge';

export const debridgeActions: ActionDefinition[] = [
  /*
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
      const fromChain = DEBRIDGE_CONFIG.CHAINS[params.fromChain];
      const toChain = DEBRIDGE_CONFIG.CHAINS[params.toChain];
      const amount = parseFloat(params.amount);

      return {
        isValid: 
          !!fromChain && 
          !!toChain && 
          !isNaN(amount) && 
          amount > 0 &&
          /^0x[a-fA-F0-9]{40}$/.test(params.tokenAddress),
        error: !fromChain || !toChain 
          ? `Invalid chain. Supported chains: ${Object.keys(DEBRIDGE_CONFIG.CHAINS).join(', ')}`
          : isNaN(amount) || amount <= 0
          ? 'Invalid amount'
          : !params.tokenAddress
          ? 'Token address is required'
          : null
      };
    },
    handler: async (params, context) => {
      if (!context.publicClient || !context.walletClient) {
        throw new Error('Wallet not connected');
      }

      // Get signature first
      const signature = await signActionMessage(
        context.walletClient,
        'bridgeTokens',
        params
      );

      // Proceed with bridge operation
      const bridgeService = new DeBridgeService(
        context.publicClient,
        context.walletClient
      );

      return await bridgeService.bridgeTokens({
        fromChainId: DEBRIDGE_CONFIG.CHAINS[params.fromChain],
        toChainId: DEBRIDGE_CONFIG.CHAINS[params.toChain],
        tokenAddress: params.tokenAddress,
        amount: params.amount,
        signature
      });
    }
  },
  */
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