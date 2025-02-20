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

export async function generateResponse(prompt: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a DeFi expert assistant on the Sonic blockchain. You help users with:
          1. Understanding DeFi concepts
          2. Checking token prices and liquidity
          3. Finding yield farming opportunities
          4. Bridging assets between chains
          5. Monitoring wallet balances
          
          Always be helpful, concise, and security-conscious. If a user asks about executing a transaction,
          always warn them about potential risks and recommend double-checking details.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
