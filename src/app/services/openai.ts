import OpenAI from 'openai';

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

export async function generateResponse(userInput: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a DeFi expert assistant on the Sonic blockchain. Your responsibilities include:
          1. Understanding DeFi concepts
          2. Checking token prices and liquidity
          3. Finding yield farming opportunities
          4. Bridging assets between chains
          5. Monitoring wallet balances

          When a user inquires about executing a transaction (e.g., bridging, staking), extract the following parameters:
          - **Action**: The type of transaction (e.g., bridge, stake)
          - **Source Chain**: The blockchain where the assets are currently located
          - **Destination Chain**: The blockchain to which the assets will be moved (if applicable)
          - **Token**: The specific cryptocurrency or the address of the token involved 
          - **Amount**: The quantity of the token to be transacted

          Always be helpful, concise, and security-conscious. If a user asks about executing a transaction, warn them about potential risks and recommend double-checking details.`
        },
        {
          role: "user",
          content: `User Input: "${userInput}"

          Please extract the following details:
          - Action:
          - Source Chain:
          - Destination Chain:
          - Token:
          - Amount:

          If any information is missing or unclear, respond with "Insufficient information to extract all parameters."`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
