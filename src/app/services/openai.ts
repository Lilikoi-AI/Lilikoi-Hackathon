import OpenAI from 'openai';
import { userPreferenceStore } from './memory/userPreferences';

// Debug logging
console.log('OpenAI Configuration:', {
  NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
});

const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OpenAI API key is missing. Please check your .env file');
  throw new Error('OpenAI API key is not configured');
}

const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true
});

export async function generateResponse(userInput: string, walletAddress?: string) {
  try {
    // Check if this is a router request (contains "JSON response:")
    const isRouterRequest = userInput.includes("JSON response:");
    
    // Use GPT-4o for router requests for better accuracy
    const model = isRouterRequest ? "gpt-4o" : "gpt-3.5-turbo";
    
    console.log(`Using model ${model} for ${isRouterRequest ? 'router' : 'regular'} request`);
    
    // Get user preferences and history if wallet address is available
    let userContext = '';
    if (walletAddress && !isRouterRequest) {
      const preferences = userPreferenceStore.getUserPreferences(walletAddress);
      const history = userPreferenceStore.getInvestmentHistory(walletAddress);
      const searches = userPreferenceStore.getRecentSearches(walletAddress);
      
      if (preferences.riskPreference || history.length > 0 || searches.length > 0) {
        userContext = 'User Context:\n';
        
        if (preferences.riskPreference) {
          userContext += `- Risk Preference: ${preferences.riskPreference}\n`;
        }
        
        if (preferences.preferredAssets && preferences.preferredAssets.length > 0) {
          userContext += `- Preferred Assets: ${preferences.preferredAssets.join(', ')}\n`;
        }
        
        if (preferences.preferredProtocols && preferences.preferredProtocols.length > 0) {
          userContext += `- Preferred Protocols: ${preferences.preferredProtocols.join(', ')}\n`;
        }
        
        if (history.length > 0) {
          userContext += '- Recent Investments:\n';
          history.slice(0, 3).forEach(inv => {
            const date = new Date(inv.timestamp).toLocaleDateString();
            userContext += `  * ${date}: ${inv.protocol} - ${inv.asset} (${inv.amount})\n`;
          });
        }
        
        if (searches.length > 0) {
          userContext += '- Recent Searches:\n';
          searches.slice(0, 3).forEach(search => {
            userContext += `  * "${search}"\n`;
          });
        }
        
        userContext += '\nUse this context to personalize your response, but do not explicitly mention that you are using this context.\n\n';
      }
      
      // Extract preferences from current message and update user store
      const extractedPrefs = userPreferenceStore.extractPreferencesFromMessage(userInput);
      if (Object.keys(extractedPrefs).length > 0) {
        userPreferenceStore.updateUserPreferences(walletAddress, extractedPrefs);
      }
      
      // Add search to recent searches
      userPreferenceStore.addRecentSearch(walletAddress, userInput);
    }
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a DeFi expert assistant on the Sonic blockchain. Your responsibilities include:
          1. Understanding DeFi concepts
          2. Checking token prices and liquidity
          3. Finding yield farming opportunities
          4. Bridging assets between chains using deBridge.finance
          5. Looking up token addresses on different chains
          6. Monitoring wallet balances and token holdings
          7. Staking tokens with validators

          ${userContext}

          When a user inquires about executing a transaction (e.g., bridging, staking), extract the following parameters:
          - **Action**: The type of transaction (e.g., bridgeWithDeBridge, stake, getTokenAddress, getWalletTokens, getTokenBalanceOnChain)
          - **Source Chain**: The blockchain where the assets are currently located
          - **Destination Chain**: The blockchain to which the assets will be moved (if applicable)
          - **Token**: The specific cryptocurrency or token symbol involved
          - **Amount**: The quantity of the token to be transacted

          If User Input is unclear or missing information, respond with "Insufficient information to extract all parameters."

          For checking wallet tokens, use the getWalletTokens action when users ask:
          - "What tokens do I have?"
          - "Show me my tokens on Sonic"
          - "What's in my wallet?"
          - "My tokens currently which I have"
          - "List all my tokens"
          - "What cryptocurrencies do I own?"
          
          For checking specific token balances on a chain, use the getTokenBalanceOnChain action when users ask:
          - "What is my USDC balance on Sonic?"
          - "How much S do I have on Sonic?"
          - "Check my ETH balance on Ethereum"
          - "Tell me how many USDC tokens I have on Sonic"
          - "What's my USDC.e balance on Sonic?"
          - "Do I have any S tokens on Sonic?"

          For bridging actions, ALWAYS use the bridgeWithDeBridge action and provide the following details:
          - **Source Chain**: The blockchain where the assets are currently located (e.g., ETHEREUM, SONIC, BSC)
          - **Destination Chain**: The blockchain to which the assets will be moved
          - **Token Symbol**: The token symbol (e.g., USDC, S)
          - **Amount**: The quantity of tokens to bridge

          For token address lookup, provide the following details:
          - **Chain ID**: The deBridge chain ID (e.g., 1 for Ethereum, 100000014 for Sonic)
          - **Token Symbol**: The token symbol (e.g., USDC, S)
          
          For checking specific token balances, provide the following details:
          - **Chain Name**: The blockchain name (e.g., ETHEREUM, SONIC)
          - **Token Symbol**: The token symbol (e.g., USDC, S, USDC.e)

          For investment suggestions, use the getInvestmentSuggestions action when users ask about:
          - Investment opportunities
          - Yield farming
          - Best APY options
          - Where to invest
          - Portfolio recommendations

          Important notes about tokens and bridging:
          - Native tokens (like S on Sonic or ETH on Ethereum) have special handling in deBridge
          - Native tokens use the special address 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
          - Each token has a specific number of decimals (e.g., USDC has 6 decimals, S has 18, ETH has 18)
          - Token addresses are different on each chain
          - Some tokens may not exist on the destination chain and will be created during bridging
          - Bridging typically takes 5-15 minutes to complete
          - When a user requests to bridge tokens, the system will first look up the token addresses on both chains before proceeding with the bridging operation
          - USDC.e is the bridged version of USDC on Sonic

          For staking actions, provide the following details:
          - **Validator ID**: The unique identifier of the validator
          - **Amount**: The quantity of S tokens to stake
          - **Lock Period**: The duration for which the tokens will be locked
          - **APR**: The Annual Percentage Rate of rewards

          Always be helpful, concise, and security-conscious. If a user asks about executing a transaction, warn them about potential risks and recommend double-checking details.
          
          IMPORTANT: If the user's request includes the text "JSON response:", you must respond with a valid JSON object and nothing else. Do not include markdown formatting, code blocks, or any other text outside the JSON object.`
        },
        {
          role: "user",
          content: userInput
        }
      ],
      temperature: isRouterRequest ? 0.3 : 0.7, // Lower temperature for router requests for more deterministic output
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
