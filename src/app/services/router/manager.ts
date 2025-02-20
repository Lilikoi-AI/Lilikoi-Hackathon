import { generateResponse } from '../openai';
import { ActionDefinition } from '../actions/types';

export class RouterManager {
  private actions: ActionDefinition[];
  private routerPrompt: string;

  constructor(actions: ActionDefinition[]) {
    this.actions = actions;
    this.routerPrompt = this.buildRouterPrompt();
  }

  private buildRouterPrompt(): string {
    const actionDescriptions = this.actions
      .map(action => `${action.name}: ${action.description}`)
      .join('\n');

    return `You are a DeFi action router. Your task is to analyze user messages and determine which action to take.

Available actions:
${actionDescriptions}

For the given message, respond with a JSON object containing:
{
  "action": "actionName",
  "confidence": 0.0-1.0,
  "parameters": { any extracted parameters }
}

If no action matches, set action to "none" and confidence to 0.

Consider:
1. User intent and context
2. Required parameters for each action
3. Confidence in the match

Examples:
Message: "What's my SONIC balance?"
Response: {
  "action": "getTokenBalance",
  "confidence": 0.95,
  "parameters": {
    "token": "SONIC"
  }
}

Message: "Bridge 100 USDC from Ethereum to BSC"
Response: {
  "action": "bridgeTokens",
  "confidence": 0.98,
  "parameters": {
    "fromChain": "ETHEREUM",
    "toChain": "BSC",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "amount": "100"
  }
}

Message: "Show me liquidity pools"
Response: {
  "action": "getLiquidityPools",
  "confidence": 0.95,
  "parameters": {}
}`;
  }

  public async routeMessage(message: string): Promise<{
    action: string;
    confidence: number;
    parameters: Record<string, any>;
  }> {
    try {
      const prompt = `${this.routerPrompt}\n\nMessage: "${message}"\nResponse:`;
      const response = await generateResponse(prompt);
      
      if (!response) {
        console.error('Empty response from router');
        return { action: 'none', confidence: 0, parameters: {} };
      }

      try {
        const result = JSON.parse(response);
        console.log('Router decision:', result);
        return result;
      } catch (error) {
        console.error('Failed to parse router response:', response);
        return { action: 'none', confidence: 0, parameters: {} };
      }
    } catch (error) {
      console.error('Router error:', error);
      return { action: 'none', confidence: 0, parameters: {} };
    }
  }

  public getActionByName(name: string): ActionDefinition | undefined {
    return this.actions.find(action => action.name === name);
  }
}
