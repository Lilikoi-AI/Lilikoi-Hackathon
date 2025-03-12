import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { 
      protocol, 
      asset, 
      apy, 
      tvl, 
      risk, 
      score,
      assetPrice,
      currentDate,
      compoundingFrequency,
      estimatedFees
    } = await request.json();
    
    if (!protocol || !asset || !apy || !tvl || !risk) {
      return NextResponse.json(
        { error: 'Missing required strategy information' },
        { status: 400 }
      );
    }
    
    // Format TVL for better readability
    const formattedTVL = (parseFloat(tvl) / 1e6).toFixed(2) + 'M';
    
    // Generate prompt for OpenAI
    const prompt = `
You are a DeFi investment advisor explaining why a particular yield strategy might be a good choice.

Strategy details:
- Protocol: ${protocol}
- Asset: ${asset}
- APY: ${apy.toFixed(2)}%
- TVL (Total Value Locked): $${formattedTVL}
- Risk Level: ${risk}
- Overall Score: ${Math.round(score)}/100
${assetPrice ? `- Current Asset Price: $${assetPrice}` : ''}
- Current Date: ${currentDate ? new Date(currentDate).toLocaleDateString() : new Date().toLocaleDateString()}
- Compounding Frequency: ${compoundingFrequency || 'daily'}
- Estimated Fees: ${estimatedFees ? `Entry: ${estimatedFees.entryFee}, Exit: ${estimatedFees.exitFee}, Management: ${estimatedFees.managementFee}` : 'Varies by protocol'}

Provide a clear and structured explanation using the following format:

SUMMARY
Write 2-3 sentences explaining why this strategy stands out.

ANALYSIS

Risk-Reward Profile:
1. Current APY Analysis: [Explain APY in current market context]
2. Risk Assessment: [Explain risk level appropriateness]
3. Market Comparison: [Compare with similar strategies]

Protocol Overview:
1. Security: [Discuss protocol's security measures]
2. TVL Analysis: [Explain TVL implications]
3. Features: [List unique protocol features]

Market Position:
1. Current Conditions: [Impact of market conditions]
2. Competition: [Position vs other protocols]
3. Future Outlook: [Expected market trajectory]

CALCULATIONS

Investment Scenarios:
1. $1,000 Investment:
   • Monthly Return: $[amount]
   • Yearly Return: $[amount]
   • APY Impact: [percentage]

2. $10,000 Investment:
   • Monthly Return: $[amount]
   • Yearly Return: $[amount]
   • APY Impact: [percentage]

3. $50,000 Investment:
   • Monthly Return: $[amount]
   • Yearly Return: $[amount]
   • APY Impact: [percentage]

RETURNS TABLE
Use | as separator, format numbers with $ and % signs:
Period | Return Amount | Total Value | Notes
1 Month | $X | $Y | Including fees
3 Months | $X | $Y | Assumes stable APY
6 Months | $X | $Y | With compounding
1 Year | $X | $Y | Full year projection

Keep all explanations clear and concise. Use numbers instead of bullet points. Format calculations with clear dollar amounts and percentages.
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a knowledgeable DeFi investment advisor providing clear, educational explanations about yield strategies. Focus on accuracy, clarity, and practical insights. Use markdown formatting for better readability." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500, // Increased token limit for more detailed response
    });
    
    // Extract the explanation from the response
    const explanation = completion.choices[0]?.message?.content || 
      `This ${protocol} strategy for ${asset} offers a competitive ${apy.toFixed(2)}% APY with a TVL of $${formattedTVL}. The ${risk} risk level aligns with conservative investment approaches, making it suitable for those seeking steady returns with managed risk.

### Analysis
The strategy provides a balanced approach to yield farming with strong security measures.

### Investment Calculations
Basic calculations show potential returns based on different investment amounts.

### Expected Returns
1 Month | ${(apy/12).toFixed(2)}% | Varies | Based on current rates
3 Months | ${(apy/4).toFixed(2)}% | Varies | Quarterly estimate
6 Months | ${(apy/2).toFixed(2)}% | Varies | Semi-annual projection
1 Year | ${apy.toFixed(2)}% | Varies | Annual return projection`;
    
    // Return the explanation
    return NextResponse.json({ explanation });
    
  } catch (error: any) {
    console.error('Error generating strategy explanation:', error);
    
    // Return a fallback explanation if OpenAI call fails
    return NextResponse.json({
      explanation: "This strategy offers a good balance of risk and reward based on your preferences. The protocol has a solid reputation and the asset provides good liquidity. The APY is competitive for the current market conditions, and the TVL indicates sufficient security and adoption."
    });
  }
} 