import { generateResponse } from '../openai';
import { ActionDefinition } from '../actions/types';
import { debridgeActions } from '../actions/debridge';
import { DEBRIDGE_CONFIG } from '../../config/debridge';

export class RouterManager {
  private actions: ActionDefinition[];
  private routerPrompt: string;

  constructor(actions: ActionDefinition[] = []) {
    this.actions = [...actions, ...debridgeActions];
    this.routerPrompt = this.buildRouterPrompt();
  }

  private buildRouterPrompt(): string {
    return `You are a DeFi routing assistant. Your task is to parse user requests and return ONLY a JSON response matching the following format:

For bridge requests:
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

Available chains: ${Object.keys(DEBRIDGE_CONFIG.CHAINS).join(', ')}
Available actions: ${this.actions.map(a => a.name).join(', ')}

DO NOT include any explanatory text. ONLY return the JSON object.
For bridge requests, always include tokenAddress (use 0x0000000000000000000000000000000000000000 for native tokens).`;
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
        
        // Validate chain support
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
}
