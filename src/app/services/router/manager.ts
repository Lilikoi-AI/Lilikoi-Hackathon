/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateResponse } from '../openai';
import { ActionDefinition } from '../actions/types';
import { debridgeActions } from '../actions/debridge';
import { stakingActions } from '../actions/staking';
import { priceActions } from '../actions/price';
import { gasActions } from '../actions/gas';
import { portfolioActions } from '../actions/portfolio';
import { DEBRIDGE_CONFIG } from '../../config/debridge';
import { STAKING_CONFIG } from '../../config/staking';
import { actions as indexActions } from '../actions';

export class RouterManager {
  private actions: ActionDefinition[];
  private routerPrompt: string;
  // const signer = useEthersSigner();

  constructor(actions: ActionDefinition[] = []) {
    this.actions = [
      ...indexActions,
      ...actions,
      ...debridgeActions,
      ...stakingActions,
      ...priceActions,
      ...gasActions,
      ...portfolioActions
    ];
    this.routerPrompt = this.buildRouterPrompt();
    
    // Debug logging
    console.log('Available actions:', this.actions.map(a => a.name));
  }

  private buildRouterPrompt(): string {
    const actionDescriptions = this.actions.map(action => {
      const params = Object.entries(action.parameters || {})
        .map(([key, desc]) => `    - ${key}: ${desc}`)
        .join('\n');
      
      return `- ${action.name}: ${action.description}\n  Parameters:\n${params}`;
    }).join('\n\n');

    return `You are a router for a DeFi agent. Your task is to analyze user requests and determine which action to take.

Available actions:
${actionDescriptions}

For checking wallet tokens, the user might say something like:
- "What tokens do I have?"
- "Show me my tokens on Sonic"
- "What's in my wallet?"
- "My tokens currently which I have"
- "List all my tokens"
- "What cryptocurrencies do I own?"

For checking specific token balances on a chain, the user might say something like:
- "What is my USDC balance on Sonic?"
- "How much S do I have on Sonic?"
- "Check my ETH balance on Ethereum"
- "Tell me how many USDC tokens I have on Sonic"
- "What's my USDC.e balance on Sonic?"
- "Do I have any S tokens on Sonic?"

For bridging tokens, ALWAYS use the bridgeWithDeBridge action. The user might say something like:
- "I want to bridge 0.1 USDC from Ethereum to Sonic"
- "Bridge my 5 S tokens from Sonic to Ethereum"
- "Transfer 10 USDC from Ethereum to Sonic"
- "I need to move 100 USDC from Ethereum mainnet to Sonic blockchain"

For token address lookup, the user might say something like:
- "What's the address of USDC on Sonic?"
- "Get me the token address for S on Ethereum"
- "Find the contract address for USDC on chain 100000014"
- "I need to know the token address and decimals for USDC on Sonic"

For staking S tokens (ALWAYS use stakeTokens action), the user might say something like:
- "I want to stake 100 S tokens with validator 1"
- "Stake 0.42 S with validator #14"
- "I want to stake 1.1 S with validator #30"
- "Stake 50 S with validator 2"
- "Help me stake 75 S tokens"
- "Can I stake with validator 2?"
- "Stake my tokens"
- "I want to delegate my S tokens"
- "Put 200 S into staking"
- "How do I stake my S tokens?"

For getting validator information, the user might say something like:
- "Show me all validators"
- "List available validators"
- "What validators can I stake with?"
- "Show validator information"
- "Tell me about the validators"
- "What are the current validator APRs?"

For claiming staking rewards, the user might say something like(ALWAYS use claimSRewards action):
- "Claim my staking rewards from validator 1"
- "Get my S token rewards"
- "Collect staking rewards"
- "Withdraw my validator rewards"
- "Claim rewards from validator #13"
- "Claim rewards from validator 16"

For unstaking S tokens, the user might say something like(ALWAYS use unstakeSTokens action):
- "Unstake 50 S tokens from validator 1"
- "Withdraw my staked tokens"
- "Remove my stake from validator"
- "I want to unstake my S tokens"
- "Unstake from validator #13"
- "Unstake from validator 16"
- "Undelegate from validator 20"
- "Unstake 0.11 S from validator 1"

For checking token prices, the user might say something like:
- "What's the price of S token?"
- "Show me USDC price"
- "How much is ETH worth right now?"
- "Get me the price of S in USD"
- "What's the current value of USDC?"

For checking price history, the user might say something like:
- "Show me S token price history"
- "What was ETH price last week?"
- "USDC price chart for last 24 hours"
- "How has S performed this month?"
- "Price trend for ETH"

For setting price alerts, the user might say something like:
- "Alert me when S goes above $1"
- "Notify me if ETH drops below $2000"
- "Set price alert for USDC at $0.99"
- "Create alert for S token price"

For checking gas prices, the user might say something like:
- "What's the gas price on Ethereum?"
- "Show me Sonic gas fees"
- "How much is gas right now?"
- "Current gas prices"
- "Is gas high on Ethereum?"

For estimating transaction costs, the user might say something like:
- "How much will it cost to bridge USDC?"
- "Estimate gas for staking S"
- "What's the fee for transferring ETH?"
- "Calculate transaction cost"

For checking portfolio performance, the user might say something like:
- "Show me my portfolio"
- "How is my portfolio performing?"
- "What's my total balance?"
- "Portfolio overview"
- "Show my assets"

For getting investment suggestions, the user might say something like:
- "What should I invest in?"
- "Give me investment ideas"
- "Suggest portfolio improvements"
- "How can I diversify?"
- "Investment recommendations"

Important notes about tokens and bridging:
- Native tokens (like S on Sonic or ETH on Ethereum) have special handling in deBridge
- Native tokens use the special address 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
- Each token has a specific number of decimals (e.g., USDC has 6 decimals, S has 18, ETH has 18)
- Token addresses are different on each chain
- Some tokens may not exist on the destination chain and will be created during bridging
- For chain IDs, use the deBridge format (e.g., 1 for Ethereum, 100000014 for Sonic)
- Bridging typically takes 5-15 minutes to complete
- When a user requests to bridge tokens, the system will first look up the token addresses on both chains before proceeding with the bridging operation

Important notes about staking:
- ALWAYS use the stakeTokens action for any staking request
- Minimum stake amount: ${STAKING_CONFIG.MIN_STAKE} S tokens
- Available validators: ${STAKING_CONFIG.VALIDATORS.map(v => v.id).join(', ')}
- If user doesn't specify a validator, use validator 1 as default
- If user doesn't specify an amount, ask them for the amount
- Staking rewards are automatically accumulated
- Unstaking has a cooldown period
- Rewards can be claimed at any time

For each request, respond with a JSON object containing:
1. The action to take (must be one of the available actions)
2. A confidence score (0-1) indicating how confident you are that this is the correct action
3. Parameters required for the action

Example response for checking wallet tokens:
{
  "action": "getWalletTokens",
  "confidence": 0.95,
  "parameters": {
    "chainId": "100000014"
  }
}

Example response for checking a specific token balance:
{
  "action": "getTokenBalanceOnChain",
  "confidence": 0.95,
  "parameters": {
    "chainName": "SONIC",
    "tokenSymbol": "USDC"
  }
}

Example response for getting validator list:
{
  "action": "getValidatorsList",
  "confidence": 0.95,
  "parameters": {}
}

Example response for bridging (ALWAYS use bridgeWithDeBridge for bridging):
{
  "action": "bridgeWithDeBridge",
  "confidence": 0.95,
  "parameters": {
    "sourceChain": "ETHEREUM",
    "destinationChain": "SONIC",
    "tokenSymbol": "USDC",
    "amount": "0.1"
  }
}

Example response for token address lookup:
{
  "action": "getTokenAddress",
  "confidence": 0.9,
  "parameters": {
    "chainId": "100000014",
    "symbol": "USDC"
  }
}

Example response for staking S tokens (ALWAYS use this format):
{
  "action": "stakeTokens",
  "confidence": 0.95,
  "parameters": {
    "validatorId": "1",  // Default to 1 if not specified
    "amount": "100"      // Must be specified by user
  }
}

Example response for claiming S token rewards:
{
  "action": "claimSRewards",
  "confidence": 0.95,
  "parameters": {
    "validatorId": "1"
  }
}

Example response for unstaking S tokens:
{
  "action": "unstakeSTokens",
  "confidence": 0.95,
  "parameters": {
    "validatorId": "1",
    "amount": "50"
  }
}

Example response for checking token price:
{
  "action": "getTokenPrice",
  "confidence": 0.95,
  "parameters": {
    "tokenSymbol": "S",
    "currency": "USD"
  }
}

Example response for checking price history:
{
  "action": "getPriceHistory",
  "confidence": 0.95,
  "parameters": {
    "tokenSymbol": "S",
    "timeframe": "24h",
    "interval": "1h"
  }
}

Example response for setting price alert:
{
  "action": "setPriceAlert",
  "confidence": 0.95,
  "parameters": {
    "tokenSymbol": "S",
    "condition": "above",
    "price": "1.00",
    "currency": "USD"
  }
}

Example response for checking gas prices:
{
  "action": "getGasPrice",
  "confidence": 0.95,
  "parameters": {
    "chain": "ETHEREUM",
    "priority": "medium"
  }
}

Example response for estimating transaction cost:
{
  "action": "estimateGasCost",
  "confidence": 0.95,
  "parameters": {
    "chain": "ETHEREUM",
    "transactionType": "bridge",
    "tokenAmount": "100"
  }
}

Example response for portfolio overview:
{
  "action": "getPortfolioOverview",
  "confidence": 0.95,
  "parameters": {
    "currency": "USD",
    "includeHistory": true
  }
}

Example response for investment suggestions:
{
  "action": "getInvestmentSuggestions",
  "confidence": 0.95,
  "parameters": {
    "riskLevel": "moderate",
    "investmentAmount": "1000",
    "currency": "USD"
  }
}

If you're not confident about the action or if the request doesn't match any action, respond with:
{
  "action": "none",
  "confidence": 0,
  "parameters": {},
  "error": "I couldn't determine the appropriate action for this request."
}

IMPORTANT: Your response must be a valid JSON object and nothing else. Do not include any explanations or text outside the JSON.`;
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
        // Clean up the response to handle potential code blocks or formatting
        let cleanedResponse = response;
        
        // Remove markdown code blocks if present
        if (response.includes("```json")) {
          cleanedResponse = response.replace(/```json\n|\n```/g, "");
        } else if (response.includes("```")) {
          cleanedResponse = response.replace(/```\n|\n```/g, "");
        }
        
        // Trim whitespace
        cleanedResponse = cleanedResponse.trim();
        
        // Try to parse the JSON
        const parsedResponse = JSON.parse(cleanedResponse);
        
        // Debug logging
        console.log('Selected action:', parsedResponse.action);
        console.log('Parameters:', parsedResponse.parameters);
        
        // Validate the action exists
        const actionExists = this.actions.some(a => a.name === parsedResponse.action);
        if (!actionExists) {
          console.error(`Action ${parsedResponse.action} not found in available actions`);
          return {
            action: 'unknown',
            confidence: 0,
            parameters: {},
            error: `Action ${parsedResponse.action} not found`
          };
        }
        
        return parsedResponse;
      } catch (error: any) {
        console.error('Failed to parse router response:', error);
        console.error('Raw response:', response);
        
        // Attempt to extract JSON from the response using regex
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedJson = jsonMatch[0];
            console.log('Attempting to parse extracted JSON:', extractedJson);
            const result = JSON.parse(extractedJson);
            return result;
          }
        } catch (extractError) {
          console.error('Failed to extract JSON:', extractError);
        }
        
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
        error: error.message || 'Unknown error'
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


