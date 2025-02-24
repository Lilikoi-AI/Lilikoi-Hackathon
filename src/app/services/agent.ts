import { State, Memory } from '@elizaos/core';
import { generateResponse } from './openai';
import { actions, ActionDefinition } from './actions';
import { RouterManager } from './router/manager';
import { handleLiquidityPools } from './actions/handlers';
import { ActionResponse } from './actions/types';

interface CharacterConfig {
  name: string;
  actors: string;
  description: string;
  personality: string[];
  capabilities: string[];
  knowledgeBase: string[];
}

const characterConfig: CharacterConfig = {
  name: 'SonicDeFiAgent',
  actors: "lilikoi",
  description: 'An AI agent specialized in DeFi operations on the Sonic blockchain',
  personality: [
    'Expert in DeFi operations',
    'Helpful and patient in explaining complex concepts',
    'Security-conscious and always promotes best practices',
    'Knowledgeable about Sonic blockchain ecosystem'
  ],
  capabilities: [
    'Bridging assets between chains',
    'Checking token prices and liquidity',
    'Providing yield farming opportunities',
    'Explaining DeFi concepts and risks',
    'Monitoring wallet balances and transactions',
    'Executing onchain transactions'
  ],
  knowledgeBase: [
    'Sonic blockchain architecture',
    'DeFi protocols and mechanisms',
    'Cross-chain bridging processes',
    'Yield farming strategies',
    'Market analysis and price tracking',
    'Smart contract interactions'
  ]
};

class SonicAgent {
  private state: State;
  private actions: ActionDefinition[];
  private router: RouterManager;

  constructor() {
    this.state = {
      agentName: characterConfig.name,
      actors: characterConfig.actors,
      bio: characterConfig.description,
      lore: JSON.stringify(characterConfig.knowledgeBase),
      messageDirections: JSON.stringify(characterConfig.capabilities),
      postDirections: JSON.stringify(characterConfig.personality),
      roomId: `1-1-1-1-1`,
      recentMessages: '',
      recentMessagesData: []
    };
    this.actions = actions;
    this.router = new RouterManager(actions);
  }

  private async executeOnchainAction(message: string, walletAddress?: string): Promise<ActionResponse | null> {
    console.log('Routing message:', message);

    const route = await this.router.routeMessage(message);
    if (route.action === 'none' || route.confidence < 0.7) {
      console.log('No suitable action found');
      return null;
    }

    const action = this.router.getActionByName(route.action);
    if (!action) {
      console.error('Action not found:', route.action);
      return null;
    }

    if (!action.validator(message, walletAddress)) {
      console.error('Action validation failed:', route.action);
      return null;
    }

    console.log(`Executing action ${route.action} with confidence ${route.confidence}`);
    return action.handler(message, walletAddress);
  }

  async processMessage(message: string, walletAddress?: string): Promise<string> {
    try {
      // Update state with the new message
      const newMessage: Memory = {
        id: `${this.state.roomId}-${Date.now().toString()}`,
        userId: `${walletAddress}-1-1-1-1`,
        agentId: `${this.state.agentName}-1-1-1-1`,
        content: { text: message },
        roomId: this.state.roomId,
        createdAt: Date.now()
      };

      this.state.recentMessagesData = [
        ...this.state.recentMessagesData,
        newMessage
      ];
      this.state.recentMessages = JSON.stringify(this.state.recentMessagesData);

      // Execute onchain action if needed
      let onchainActionData = null;
      try {
        onchainActionData = await this.executeOnchainAction(message, walletAddress);
      } catch (error) {
        console.error('Onchain action error:', error);
      }

      // Use OpenAI to generate the response
      const openAiResponse = await generateResponse(message);

      // Create the response content
      let responseText = openAiResponse;
      if (onchainActionData) {
        responseText += '\n\nOnchain Data: ' + JSON.stringify(onchainActionData, null, 2);
      }

      // Add the response to recent messages
      const agentResponse: Memory = {
        id: `${this.state.roomId}-${Date.now().toString()}`,
        userId: `${this.state.agentName}-1-1-1-1`,
        agentId: `${this.state.agentName}-1-1-1-1`,
        content: { text: responseText || '' },
        roomId: this.state.roomId,
        createdAt: Date.now()
      };

      this.state.recentMessagesData = [
        ...this.state.recentMessagesData,
        agentResponse
      ];
      this.state.recentMessages = JSON.stringify(this.state.recentMessagesData);

      // if (onchainData && onchainData.action === 'getLiquidityPools') {
      //   const response = await handleLiquidityPools();
      //   return response.text;
      // }

      return responseText || '';
    } catch (error) {
      console.error('Agent error:', error);
      return 'I apologize, but I encountered an issue processing your request. Please try again in a moment.';
    }
  }
}

// Create a singleton instance
const sonicAgent = new SonicAgent();

export default sonicAgent;
