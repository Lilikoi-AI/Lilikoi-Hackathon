import { NextRequest, NextResponse } from 'next/server';

// DeFiLlama API endpoints
const DEFILLAMA_API_BASE = 'https://yields.llama.fi';
const YIELDS_ENDPOINT = '/pools';

/**
 * GET handler for the strategy API
 * Queries DeFiLlama to get detailed information about a specific yield strategy
 */
export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const protocol = searchParams.get('protocol');
    const asset = searchParams.get('asset');
    
    console.log(`\n===================== STRATEGY API CALL =====================`);
    console.log(`GET /api/defi/strategy?protocol=${protocol}&asset=${asset}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Check for required parameters
    if (!protocol || !asset) {
      console.log(`Error: Missing required parameters`);
      return NextResponse.json(
        { error: 'Protocol and asset parameters are required' },
        { status: 400 }
      );
    }
    
    // Log the call to DeFiLlama
    console.log(`\n📡 DeFiLlama API Call:`);
    console.log(`GET ${DEFILLAMA_API_BASE}${YIELDS_ENDPOINT}`);
    console.log(`Search parameters: protocol=${protocol}, asset=${asset}`);
    
    // Fetch strategy data from DeFiLlama
    const defildataResponse = await fetch(`${DEFILLAMA_API_BASE}${YIELDS_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    // Log the response from DeFiLlama
    console.log(`\n📥 DeFiLlama Response:`);
    console.log(`Status: ${defildataResponse.status} ${defildataResponse.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(defildataResponse.headers))}`);
    
    if (!defildataResponse.ok) {
      console.log(`Error: DeFiLlama API returned status ${defildataResponse.status}`);
      return NextResponse.json(
        { error: `DeFiLlama API error: ${defildataResponse.status}` },
        { status: defildataResponse.status }
      );
    }
    
    // Parse the response
    const llamaData = await defildataResponse.json();
    
    if (!llamaData.data || !Array.isArray(llamaData.data)) {
      console.log(`Error: Invalid response format from DeFiLlama API`);
      return NextResponse.json(
        { error: 'Invalid response format from DeFiLlama API' },
        { status: 500 }
      );
    }
    
    console.log(`\n🔍 Received ${llamaData.data.length} pools from DeFiLlama`);
    
    // Find the specific strategy
    const strategyData = llamaData.data.find((pool: any) => {
      // Check if both protocol and asset match
      // Note: We do case-insensitive comparison and use includes for flexibility
      const protocolMatch = pool.project && 
        pool.project.toLowerCase().includes(protocol.toLowerCase());
      
      const assetMatch = pool.symbol && 
        pool.symbol.toLowerCase().includes(asset.toLowerCase());
      
      return protocolMatch && assetMatch;
    });
    
    // If strategy is not found
    if (!strategyData) {
      console.log(`\n❌ Strategy not found for ${protocol} - ${asset}`);
      
      // Try to find strategies just from the protocol
      const protocolStrategies = llamaData.data
        .filter((pool: any) => pool.project && 
          pool.project.toLowerCase().includes(protocol.toLowerCase()))
        .map((pool: any) => ({
          project: pool.project,
          symbol: pool.symbol,
          apy: pool.apy
        }));
      
      if (protocolStrategies.length > 0) {
        console.log(`Found ${protocolStrategies.length} alternative strategies from the same protocol`);
      }
      
      return NextResponse.json({
        error: `Strategy not found for ${protocol} - ${asset}`,
        alternativeStrategies: protocolStrategies.length > 0 ? protocolStrategies : undefined,
        fallback: {
          protocol,
          asset,
          apy: 0,
          description: `Detailed information for ${protocol} - ${asset} isn't available yet.`
        }
      });
    }
    
    // Log the found strategy
    console.log(`\n✅ Found strategy for ${protocol} - ${asset}:`);
    console.log(`APY: ${strategyData.apy}%`);
    console.log(`TVL: $${strategyData.tvlUsd}`);
    console.log(`Chain: ${strategyData.chain}`);
    
    // Return the strategy details
    const response = {
      protocol,
      asset,
      detail: strategyData,
      message: `Successfully retrieved details for ${protocol} - ${asset}`
    };
    
    console.log(`\n📤 Sending response with strategy details`);
    console.log(`===================== END STRATEGY API CALL =====================\n`);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Error fetching strategy details:', error);
    
    return NextResponse.json(
      { 
        error: `Failed to fetch strategy details: ${error.message}`,
        fallback: {
          description: "We're having trouble connecting to our data sources. Please try again later."
        }
      },
      { status: 500 }
    );
  }
} 