/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateResponse } from '../openai';
import { ActionDefinition } from '../actions/types';
import { debridgeActions } from '../actions/debridge';
import { stakingActions } from '../actions/staking';
import { DEBRIDGE_CONFIG } from '../../config/debridge';
import { STAKING_CONFIG } from '../../config/staking';

export class RouterManager {
  private actions: ActionDefinition[];
  private routerPrompt: string;
  // const signer = useEthersSigner();

  constructor(actions: ActionDefinition[] = []) {
    this.actions = [...actions, ...debridgeActions, ...stakingActions];
    this.routerPrompt = this.buildRouterPrompt();
  }

  private buildRouterPrompt(): string {
    return `You are a DeFi routing assistant. Parse user requests for bridge and Sonic (S) token staking operations.

Available actions: ${this.actions.map(a => a.name).join(', ')}

Example responses (Here use this responses as the reference response):

For bridge operations:
{
  "action": "bridgeTokens",
  "confidence": 0.95,
  "parameters": {
    "fromChain": "ETHEREUM",
    "toChain": "BSC",
    "amount": "0.1",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" //address of the token user want to bridge.
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async routeMessage(message: string, context: { chainId?: number; walletAddress?: string } = {}): Promise<{
    action: string;
    confidence: number;
    parameters: Record<string, any>;
    error?: string;
  }> {
    try {
      const prompt = `${this.routerPrompt}\n\nUser request: "${message}"\nJSON response:`;
      const response = await generateResponse(prompt) || "";

      console.log('OpenAI response:', response);

      try {
        const result = JSON.parse(response);
        return result;
      } catch (error: any) {
        console.error('Failed to parse router response:', error);
        return {
          action: 'none',
          confidence: 0,
          parameters: {},
          error: 'Invalid response format'
        };
      }
    } catch (error: any) {
      console.error('Router error:', error);
      return {
        action: 'none',
        confidence: 0,
        parameters: {},
        error: error?.message
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
