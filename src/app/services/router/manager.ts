import { generateResponse } from '../openai';
import { ActionDefinition } from '../actions/types';
import { debridgeActions } from '../actions/debridge';
import { stakingActions } from '../actions/staking';
import { DEBRIDGE_CONFIG } from '../../config/debridge';
import { STAKING_CONFIG, getValidatorById } from '../../config/staking';

export class RouterManager {
  private actions: ActionDefinition[];
  private routerPrompt: string;

  constructor(actions: ActionDefinition[] = []) {
    this.actions = [...actions, ...debridgeActions, ...stakingActions];
    this.routerPrompt = this.buildRouterPrompt();
  }

  private buildRouterPrompt(): string {
    return `You are a DeFi routing assistant. Parse user requests for bridge and Sonic (S) token staking operations.

Available actions: ${this.actions.map(a => a.name).join(', ')}

Example responses:

For bridge operations:
{
  "action": "bridgeTokens",
  "confidence": 0.95,
  "parameters": {
    "fromChain": "ETHEREUM",
    "toChain": "BSC",
    "amount": "0.1",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  }
}

For S token staking:
{
  "action": "stakeTokens",
  "confidence": 0.95,
  "parameters": {
    "validatorId": "1",
    "amount": "100"  // Amount in S tokens
  }
}

For claiming S token rewards:
{
  "action": "claimSRewards",
  "confidence": 0.95,
  "parameters": {
    "validatorId": "1"
  }
}

For unstaking S tokens:
{
  "action": "unstakeSTokens",
  "confidence": 0.95,
  "parameters": {
    "validatorId": "1",
    "amount": "50"  // Amount in S tokens
  }
}

Available chains for bridging: ${Object.keys(DEBRIDGE_CONFIG.CHAINS).join(', ')}
Available validators for staking: ${STAKING_CONFIG.VALIDATORS.map(v => v.id).join(', ')}
Minimum stake amount: ${STAKING_CONFIG.MIN_STAKE} S tokens

DO NOT include any explanatory text. ONLY return the JSON object.`;
  }

  public async routeMessage(message: string, context: { chainId?: number; walletAddress?: string } = {}): Promise<{
    action: string;
    confidence: number;
    parameters: Record<string, any>;
    error?: string;
  }> {
    try {
      const prompt = `${this.routerPrompt}\n\nUser request: "${message}"\nJSON response:`;
      const response = await generateResponse(prompt);
      
      console.log('OpenAI response:', response);

      try {
        const result = JSON.parse(response.trim());
        
        // Validate bridge operations
        if (result.action === 'bridgeTokens') {
          const fromChain = result.parameters.fromChain;
          const toChain = result.parameters.toChain;
          
          if (!DEBRIDGE_CONFIG.CHAINS[fromChain] || !DEBRIDGE_CONFIG.CHAINS[toChain]) {
            return {
              action: 'none',
              confidence: 0,
              parameters: {},
              error: `Unsupported chain. Supported chains: ${Object.keys(DEBRIDGE_CONFIG.CHAINS).join(', ')}`
            };
          }
        }

        // Validate staking operations
        if (['stakeTokens', 'claimSRewards', 'unstakeSTokens'].includes(result.action)) {
          const validatorId = parseInt(result.parameters.validatorId);
          const validator = getValidatorById(validatorId);
          
          if (!validator) {
            return {
              action: 'none',
              confidence: 0,
              parameters: {},
              error: `Invalid validator ID. Available validators: ${STAKING_CONFIG.VALIDATORS.map(v => v.id).join(', ')}`
            };
          }

          // Validate minimum stake amount for staking and unstaking
          if (['stakeTokens', 'unstakeSTokens'].includes(result.action)) {
            const amount = parseFloat(result.parameters.amount);
            if (amount < parseFloat(STAKING_CONFIG.MIN_STAKE)) {
              return {
                action: 'none',
                confidence: 0,
                parameters: {},
                error: `Minimum amount is ${STAKING_CONFIG.MIN_STAKE} S tokens`
              };
            }
          }
        }

        return result;
      } catch (error) {
        console.error('Failed to parse router response:', response);
        return {
          action: 'none',
          confidence: 0,
          parameters: {},
          error: 'Invalid response format'
        };
      }
    } catch (error) {
      console.error('Router error:', error);
      return {
        action: 'none',
        confidence: 0,
        parameters: {},
        error: error.message
      };
    }
  }

  public getActionByName(name: string): ActionDefinition | undefined {
    return this.actions.find(action => action.name === name);
  }

  public getSupportedChains(): string[] {
    return Object.keys(DEBRIDGE_CONFIG.CHAINS);
  }

  public getValidators(): typeof STAKING_CONFIG.VALIDATORS {
    return STAKING_CONFIG.VALIDATORS;
  }
}
