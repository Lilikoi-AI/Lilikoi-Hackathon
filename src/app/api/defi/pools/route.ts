import { NextRequest, NextResponse } from 'next/server';

// DeFiLlama API endpoints
const DEFILLAMA_API_BASE = 'https://yields.llama.fi';
const YIELDS_ENDPOINT = '/pools';

/**
 * GET handler for the pools API
 * Returns all available yield pools from DeFiLlama
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`\n===================== POOLS API CALL =====================`);
    console.log(`GET /api/defi/pools`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Log the call to DeFiLlama
    console.log(`\n📡 DeFiLlama API Call:`);
    console.log(`GET ${DEFILLAMA_API_BASE}${YIELDS_ENDPOINT}`);
    
    // Fetch pools data from DeFiLlama with proper headers and timeout
    const defiLlamaResponse = await fetch(`${DEFILLAMA_API_BASE}${YIELDS_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Lilikoi-Eth/1.0'
      },
      next: {
        revalidate: 300 // Cache for 5 minutes
      }
    });
    
    // Log the response from DeFiLlama
    console.log(`\n📥 DeFiLlama Response:`);
    console.log(`Status: ${defiLlamaResponse.status} ${defiLlamaResponse.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(defiLlamaResponse.headers))}`);
    
    if (!defiLlamaResponse.ok) {
      console.log(`Error: DeFiLlama API returned status ${defiLlamaResponse.status}`);
      
      // Return demo data if DeFiLlama API fails
      console.log(`\n⚠️ Using demo data due to API error`);
      const demoData = {
        data: [
          {
            project: 'Sonic Lend',
            symbol: 'USDC',
            apy: 3.8,
            tvlUsd: 1000000000,
            chain: 'Sonic'
          },
          {
            project: 'Sonic Swap',
            symbol: 'ETH',
            apy: 4.5,
            tvlUsd: 500000000,
            chain: 'Sonic'
          },
          {
            project: 'Iconic Finance',
            symbol: 'ICX',
            apy: 5.7,
            tvlUsd: 750000000,
            chain: 'Sonic'
          },
          {
            project: 'Sonic Stake',
            symbol: 'SON',
            apy: 8.2,
            tvlUsd: 250000000,
            chain: 'Sonic'
          },
          {
            project: 'Sonic Farm',
            symbol: 'SON-ETH LP',
            apy: 12.5,
            tvlUsd: 100000000,
            chain: 'Sonic'
          }
        ]
      };
      
      return NextResponse.json(demoData);
    }
    
    // Parse the response
    const llamaData = await defiLlamaResponse.json();
    
    // Log summary of data
    if (llamaData.data && Array.isArray(llamaData.data)) {
      console.log(`\n✅ Successfully retrieved ${llamaData.data.length} pools from DeFiLlama`);
      
      // Log some stats about the data
      const chains = new Set();
      const projects = new Set();
      
      llamaData.data.forEach((pool: any) => {
        if (pool.chain) chains.add(pool.chain);
        if (pool.project) projects.add(pool.project);
      });
      
      console.log(`Found ${chains.size} unique chains and ${projects.size} unique projects`);
      console.log(`Top 5 projects: ${Array.from(projects).slice(0, 5).join(', ')}`);
    } else {
      console.log(`Warning: Unexpected data format from DeFiLlama API`);
      // Return demo data if response format is invalid
      return NextResponse.json({
        data: [
          {
            project: 'Sonic Lend',
            symbol: 'USDC',
            apy: 3.8,
            tvlUsd: 1000000000,
            chain: 'Sonic'
          },
          {
            project: 'Sonic Swap',
            symbol: 'ETH',
            apy: 4.5,
            tvlUsd: 500000000,
            chain: 'Sonic'
          }
        ]
      });
    }
    
    console.log(`\n📤 Sending response with all pools data`);
    console.log(`===================== END POOLS API CALL =====================\n`);
    
    // Set CORS headers
    const response = NextResponse.json(llamaData);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching pools data:', error);
    
    // Return demo data on error
    console.log(`\n⚠️ Using demo data due to error: ${error.message}`);
    return NextResponse.json({
      data: [
        {
          project: 'Sonic Lend',
          symbol: 'USDC',
          apy: 3.8,
          tvlUsd: 1000000000,
          chain: 'Sonic'
        },
        {
          project: 'Sonic Swap',
          symbol: 'ETH',
          apy: 4.5,
          tvlUsd: 500000000,
          chain: 'Sonic'
        }
      ]
    });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
  return response;
} 