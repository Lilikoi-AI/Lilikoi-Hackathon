import { ethers } from 'ethers';
import { SONIC_RPC, SONIC_API_BASE } from '../constants';

// Protocol ABIs (simplified for example)
const AAVE_POOL_ABI = [
  'function getReservesList() view returns (address[])',
  'function getReserveData(address asset) view returns (tuple(uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex))',
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)'
];

const EULER_MARKETS_ABI = [
  'function getMarkets() view returns (address[])',
  'function getMarketAPY(address underlying) view returns (uint256)',
  'function deposit(uint256 subAccountId, address underlying, uint256 amount)'
];

const FRAX_STAKING_ABI = [
  'function getPoolAPY() view returns (uint256)',
  'function stake(uint256 amount)'
];

// Generic ABI for basic ERC20 vault operations
const GENERIC_ERC20_VAULT_ABI = [
  "function deposit(uint256 _amount) external",
  "function withdraw(uint256 _amount) external",
  "function stake(uint256 _amount) external",
  "function unstake(uint256 _amount) external",
  "function balanceOf(address account) view external returns (uint256)",
  "function getPricePerFullShare() view external returns (uint256)"
];

interface YieldData {
  protocol: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
}

interface ProtocolAddresses {
  [key: string]: {
    [key: string]: string;  // Contract addresses for each protocol
  };
}

interface StrategyDetails {
  protocol: string;
  asset: string;
  apy: number;
  tvlUsd?: number;
  apyBase?: number;
  apyReward?: number;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  url?: string;
  audits?: string;
  volumeUsd24h?: number;
  il7d?: number;
  description?: string;
  poolMeta?: string;
  // Add more fields as needed
}

// Protocol investment interfaces
interface ProtocolAdapter {
  contractAddress: string;
  abi: any[];
  investMethod: string; // The method name to call for investing
  investArgs: (asset: string, amount: string, userAddress: string) => any[]; // Function to format args for the invest method
  contractGetter?: (protocolInfo: any) => Promise<string>; // Optional dynamic contract address getter
}

// Protocol adapter registry
const protocolAdapters: Record<string, ProtocolAdapter> = {
  'aave': {
    contractAddress: '0xaave_pool_address',
    abi: AAVE_POOL_ABI,
    investMethod: 'supply',
    investArgs: (asset: string, amount: string, userAddress: string) => [asset, amount, userAddress, 0]
  },
  'euler': {
    contractAddress: '0xeuler_markets_address',
    abi: EULER_MARKETS_ABI,
    investMethod: 'deposit',
    investArgs: (asset, amount) => [0, asset, amount]
  },
  'frax': {
    contractAddress: '0xfrax_staking_address',
    abi: FRAX_STAKING_ABI,
    investMethod: 'stake',
    investArgs: (_, amount) => [amount]
  },
  'beefy': {
    contractAddress: '0x0000', // Will be dynamically determined
    abi: [
      'function deposit(uint256 _amount) external',
      'function depositAll() external',
      'function withdraw(uint256 _shares) external',
      'function withdrawAll() external',
      'event Deposit(address indexed user, uint256 amount)'
    ],
    investMethod: 'deposit',
    investArgs: (_, amount) => [amount],
    contractGetter: async (strategy) => {
      // In a real implementation, this would fetch the vault address from the Beefy API
      console.log('Getting Beefy vault address for strategy:', strategy);
      return '0xbeefy_vault_address'; // This would be dynamic based on the strategy
    }
  },
  'yearn': {
    contractAddress: '0x0000', // Will be dynamically determined
    abi: [
      'function deposit(uint256 amount) external returns (uint256)',
      'function withdraw(uint256 maxShares) external returns (uint256)',
      'event Deposit(address indexed sender, uint256 amount)'
    ],
    investMethod: 'deposit',
    investArgs: (_, amount) => [amount],
    contractGetter: async (strategy) => {
      // This would fetch the Yearn vault address
      return '0xyearn_vault_address';
    }
  }
};

// Dynamic adapter registry for protocols from DeFiLlama
const dynamicAdapters: Record<string, ProtocolAdapter> = {};

export class YieldService {
  private static provider = new ethers.JsonRpcProvider(SONIC_RPC);
  
  // Protocol contract addresses on Sonic
  private static addresses: ProtocolAddresses = {
    aave: {
      pool: '0xaave_pool_address',
      dataProvider: '0xaave_data_provider'
    },
    euler: {
      markets: '0xeuler_markets_address'
    },
    frax: {
      staking: '0xfrax_staking_address'
    }
  };

  /**
   * Get all available yield opportunities across protocols
   */
  static async getYieldOpportunities(): Promise<YieldData[]> {
    try {
      // Use DeFiLlama through our proxy
      console.log('\n📡 API Call:');
      console.log('GET /api/defi/pools');
      console.log('Fetching yield data from DeFiLlama via proxy...');

      const defiLlamaResponse = await fetch('/api/defi/pools', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!defiLlamaResponse.ok) {
        throw new Error(`DeFiLlama API error: ${defiLlamaResponse.status} ${defiLlamaResponse.statusText}`);
      }

      const llamaData = await defiLlamaResponse.json();
      
      console.log('\n📥 Response from DeFiLlama:');
      console.log('Status:', defiLlamaResponse.status);
      console.log('Headers:', Object.fromEntries(defiLlamaResponse.headers));
      
      // Extract the pools array from the response data structure
      const pools = llamaData.data;
      
      if (!Array.isArray(pools)) {
        console.error('Invalid response format:', llamaData);
        throw new Error('Invalid response format from DeFiLlama API - expected array in data field');
      }

      // Now that we know pools is an array, we can safely slice it
      console.log('\nFirst 3 pools from response:');
      console.log(JSON.stringify(pools.slice(0, 3), null, 2));
      
      // Define Sonic-related protocols and chains
      const sonicProtocols = ['Sonic', 'SonicSwap', 'SonicDEX', 'Iconic'];
      const sonicChains = ['Sonic', 'Iconic', 'ICON'];
      
      // Transform pools and filter for Sonic-related protocols or chains
      const relevantPools = pools
        .filter((pool: any) => 
          // Basic validation of required fields
          pool.project && 
          pool.symbol && 
          typeof pool.apy !== 'undefined' &&
          typeof pool.tvlUsd !== 'undefined' &&
          // Filter for Sonic-related protocols or chains
          (
            sonicProtocols.some(protocol => 
              pool.project.toLowerCase().includes(protocol.toLowerCase())
            ) ||
            (pool.chain && sonicChains.some(chain => 
              pool.chain.toLowerCase().includes(chain.toLowerCase())
            ))
          )
        )
        .map((pool: any) => ({
          protocol: pool.project,
          asset: pool.symbol,
          apy: parseFloat(pool.apy) || 0,
          tvl: (pool.tvlUsd || '0').toString(),
          risk: this.calculateRiskLevel(
            parseFloat(pool.apy) || 0,
            pool.tvlUsd || '0',
            pool.il7d || 0 // Use 7-day impermanent loss as volatility metric
          )
        }));

      console.log('\n📊 Processed Sonic pools:');
      console.log(`Found ${relevantPools.length} valid Sonic pools`);
      console.log('Sample of first 3 pools:', JSON.stringify(relevantPools.slice(0, 3), null, 2));

      if (relevantPools.length === 0) {
        throw new Error('No valid Sonic pools found in API response');
      }

      console.log(`\n✨ Successfully processed ${relevantPools.length} Sonic yield opportunities`);
      return relevantPools;

    } catch (error) {
      console.error('\n❌ Error fetching Sonic yield opportunities:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - possible CORS or connectivity issue');
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Request timed out after 10 seconds');
      }
      
      // Return Sonic-specific demo data instead of trying fallback API
      console.log('\n⚠️ Using Sonic demo data due to API error');
      const demoData: YieldData[] = [
        {
          protocol: 'Sonic Lend',
          asset: 'USDC',
          apy: 3.8,
          tvl: '1000000000',
          risk: 'low' as const
        },
        {
          protocol: 'Sonic Swap',
          asset: 'ETH',
          apy: 4.5,
          tvl: '500000000',
          risk: 'low' as const
        },
        {
          protocol: 'Iconic Finance',
          asset: 'ICX',
          apy: 5.7,
          tvl: '750000000',
          risk: 'medium' as const
        },
        {
          protocol: 'Sonic Stake',
          asset: 'SON',
          apy: 8.2,
          tvl: '250000000',
          risk: 'medium' as const
        },
        {
          protocol: 'Sonic Farm',
          asset: 'SON-ETH LP',
          apy: 12.5,
          tvl: '100000000',
          risk: 'high' as const
        }
      ];
      console.log('Sonic demo data:', JSON.stringify(demoData, null, 2));
      return demoData;
    }
  }

  /**
   * Calculate risk level based on APY, TVL, and volatility
   */
  private static calculateRiskLevel(
    apy: number,
    tvl: string | number,
    volatility: number
  ): 'low' | 'medium' | 'high' {
    try {
      const tvlNum = typeof tvl === 'string' ? parseFloat(tvl) : tvl;
      
      if (isNaN(tvlNum) || tvlNum <= 0) return 'high';
      if (isNaN(apy)) apy = 0;
      if (isNaN(volatility)) volatility = 0;
      
      // Risk increases with higher APY and volatility, decreases with higher TVL
      const riskScore = (apy * 0.3) + (volatility * 0.4) - (Math.log10(tvlNum) * 0.3);
      
      if (riskScore < 5) return 'low';
      if (riskScore < 15) return 'medium';
      return 'high';
    } catch (error) {
      console.error('Error calculating risk level:', error);
      return 'medium'; // Default to medium risk on error
    }
  }

  /**
   * Get best yield opportunity based on parameters
   */
  static async getBestYield(
    riskPreference: 'low' | 'medium' | 'high' = 'low',
    minTVL: string = '1000000'
  ): Promise<YieldData | null> {
    try {
      console.log(`\n🔍 Finding best Sonic yield opportunity:`);
      console.log(`Risk Preference: ${riskPreference}`);
      console.log(`Minimum TVL: $${minTVL}`);
      
      // This will already be filtered for Sonic opportunities
      const opportunities = await this.getYieldOpportunities();
      
      // Ensure minTVL is a valid number
      const minTVLNum = BigInt(minTVL || '0');
      
      // Filter by risk preference and minimum TVL
      const filtered = opportunities.filter(opp => {
        try {
          return opp.risk === riskPreference &&
                 BigInt(opp.tvl) >= minTVLNum;
        } catch {
          return false;
        }
      });

      // Sort by APY
      filtered.sort((a, b) => b.apy - a.apy);
      
      if (filtered.length > 0) {
        console.log(`\n✨ Best Sonic yield found:`);
        console.log(`Protocol: ${filtered[0].protocol}`);
        console.log(`Asset: ${filtered[0].asset}`);
        console.log(`APY: ${filtered[0].apy}%`);
        console.log(`TVL: $${filtered[0].tvl}`);
        console.log(`Risk: ${filtered[0].risk}`);
      } else {
        console.log('❌ No Sonic yield opportunities found matching the criteria');
      }
      
      return filtered[0] || null;
    } catch (error) {
      console.error('Error getting best Sonic yield:', error);
      return null;
    }
  }

  /**
   * Get protocol adapter for a specific protocol
   */
  static getProtocolAdapter(protocolKey: string): ProtocolAdapter | null {
    const normalizedKey = protocolKey.toLowerCase();
    return protocolAdapters[normalizedKey] || dynamicAdapters[normalizedKey] || null;
  }

  /**
   * Register a protocol adapter dynamically
   * This allows supporting new protocols without code changes
   */
  static registerProtocolAdapter(
    protocol: string,
    adapter: ProtocolAdapter
  ): void {
    const normalizedKey = protocol.toLowerCase();
    
    // Check if adapter already exists in static registry
    if (normalizedKey in protocolAdapters) {
      console.log(`Protocol adapter for ${protocol} already exists in static registry`);
      return;
    }
    
    // Register or update in dynamic registry
    dynamicAdapters[normalizedKey] = adapter;
    console.log(`Registered protocol adapter for ${protocol}`);
  }

  /**
   * Register a generic adapter for a protocol
   * This creates a basic adapter for simple deposit/stake contracts
   */
  static registerGenericAdapter(
    protocol: string, 
    contractAddress: string,
    method: 'deposit' | 'stake' = 'deposit'
  ): void {
    this.registerProtocolAdapter(protocol, {
      contractAddress,
      abi: GENERIC_ERC20_VAULT_ABI,
      investMethod: method,
      investArgs: (asset: string, amount: string, userAddress: string) => [amount]
    });
  }

  /**
   * Allocate funds to a specific protocol
   */
  static async allocateFunds(
    protocol: string,
    asset: string,
    amount: string,
    wallet: ethers.Signer
  ): Promise<boolean> {
    let adapter = this.getProtocolAdapter(protocol);
    if (!adapter) {
      console.error(`No adapter found for protocol: ${protocol}`);
      
      // Auto-register a generic adapter as fallback
      const { ProtocolsService } = await import('./protocols');
      if (ProtocolsService.isProtocolSupported(protocol)) {
        // Try to get vault address from ProtocolsService
        try {
          const vaultAddress = await ProtocolsService.getVaultAddress(protocol, asset);
          this.registerGenericAdapter(protocol, vaultAddress);
          console.log(`Auto-registered generic adapter for ${protocol} with address ${vaultAddress}`);
          
          // Get the adapter again after registration
          adapter = this.getProtocolAdapter(protocol);
          if (!adapter) {
            console.error(`Failed to get adapter after registration for ${protocol}`);
            return false;
          }
        } catch (e) {
          console.error(`Failed to auto-register adapter for ${protocol}:`, e);
          return false;
        }
      } else {
        return false;
      }
    }
    
    try {
      const userAddress = await wallet.getAddress();
      
      // Get contract address (static or dynamic)
      let contractAddress = adapter.contractAddress;
      if (adapter.contractGetter) {
        try {
          contractAddress = await adapter.contractGetter({ protocol, asset });
        } catch (error) {
          console.error(`Error getting contract address for ${protocol}:`, error);
          return false;
        }
      }
      
      // For placeholder addresses, try to get the real address from ProtocolsService
      if (contractAddress.startsWith('0x000000') || contractAddress.includes(protocol)) {
        try {
          const { ProtocolsService } = await import('./protocols');
          contractAddress = await ProtocolsService.getVaultAddress(protocol, asset);
          console.log(`Updated contract address for ${protocol} to ${contractAddress}`);
        } catch (e) {
          console.error(`Failed to get vault address for ${protocol}:`, e);
          return false;
        }
      }
      
      console.log(`Allocating funds to ${protocol} (${asset})`);
      console.log(`Contract: ${contractAddress}`);
      console.log(`Method: ${adapter.investMethod}`);
      
      // Create token contract for approval
      const { TokenService } = await import('./token');
      const tokenAddress = await TokenService.getTokenAddress(asset);
      
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function approve(address spender, uint256 amount) external returns (bool)"
      ], wallet);
      
      // Approve token spending if needed
      try {
        const approveTx = await tokenContract.approve(contractAddress, amount);
        await approveTx.wait();
        console.log(`Approved ${amount} ${asset} for ${protocol}`);
      } catch (error) {
        console.error(`Error approving tokens for ${protocol}:`, error);
        return false;
      }
      
      // Create contract and execute investment
      const contract = new ethers.Contract(contractAddress, adapter.abi, wallet);
      const args = adapter.investArgs(asset, amount, userAddress);
      
      console.log(`Calling ${adapter.investMethod} with args:`, args);
      
      const tx = await contract[adapter.investMethod](...args);
      await tx.wait();
      
      console.log(`Successfully allocated funds to ${protocol}`);
      return true;
    } catch (error) {
      console.error(`Error allocating funds to ${protocol} for ${asset}:`, error);
      return false;
    }
  }

  /**
   * Monitor yields and suggest rebalancing
   */
  static async monitorYields(
    currentAllocation: {
      protocol: string;
      asset: string;
      amount: string;
    }[],
    riskPreference: 'low' | 'medium' | 'high' = 'low'
  ): Promise<{
    shouldRebalance: boolean;
    suggestion?: {
      from: { protocol: string; asset: string };
      to: { protocol: string; asset: string };
      reason: string;
    };
  }> {
    console.log('\n📊 Monitoring yields for rebalancing opportunities...');
    console.log('Current allocation:');
    currentAllocation.forEach(alloc => {
      console.log(`- ${alloc.protocol}: ${alloc.amount} ${alloc.asset}`);
    });
    
    const opportunities = await this.getYieldOpportunities();
    const currentYields = currentAllocation.map(alloc => {
      const opp = opportunities.find(o => 
        o.protocol.toLowerCase() === alloc.protocol.toLowerCase() &&
        o.asset.toLowerCase() === alloc.asset.toLowerCase()
      );
      return {
        ...alloc,
        apy: opp?.apy || 0
      };
    });

    // Find best available yield
    console.log('\n🔍 Checking for better yields...');
    const bestYield = await this.getBestYield(riskPreference);
    
    if (!bestYield) {
      console.log('❌ No better yield opportunities found');
      return { shouldRebalance: false };
    }

    // Check if current allocation has significantly lower APY
    const lowestYield = currentYields.reduce(
      (min, curr) => curr.apy < min.apy ? curr : min,
      currentYields[0]
    );

    if (bestYield.apy > lowestYield.apy + 2) { // 2% threshold for rebalancing
      console.log('\n🔄 Rebalancing opportunity found:');
      console.log(`From: ${lowestYield.protocol} (${lowestYield.apy}% APY)`);
      console.log(`To: ${bestYield.protocol} (${bestYield.apy}% APY)`);
      console.log(`Potential APY increase: ${(bestYield.apy - lowestYield.apy).toFixed(2)}%`);
      
      return {
        shouldRebalance: true,
        suggestion: {
          from: {
            protocol: lowestYield.protocol,
            asset: lowestYield.asset
          },
          to: {
            protocol: bestYield.protocol,
            asset: bestYield.asset
          },
          reason: `Better yield available: ${bestYield.apy}% APY vs current ${lowestYield.apy}% APY`
        }
      };
    }

    console.log('✅ Current allocation is optimal - no rebalancing needed');
    return { shouldRebalance: false };
  }

  // Helper functions
  private static calculateAaveAPY(liquidityRate: bigint): number {
    const RAY = BigInt('1000000000000000000000000000'); // 10^27
    const SECONDS_PER_YEAR = 31536000;
    
    const rate = Number(liquidityRate) / Number(RAY);
    return (Math.pow(1 + rate / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100;
  }

  private static async getReserveTVL(reserve: string): Promise<string> {
    // Implementation would fetch TVL from Aave
    return '10000000'; // Demo value
  }

  private static async getMarketTVL(market: string): Promise<string> {
    // Implementation would fetch TVL from Euler
    return '5000000'; // Demo value
  }

  private static async getStakingTVL(): Promise<string> {
    // Implementation would fetch TVL from Frax
    return '7500000'; // Demo value
  }

  /**
   * Get protocol contract address
   */
  static getProtocolAddress(protocol: string): string {
    const protocolKey = protocol.toLowerCase();
    if (protocolKey in this.addresses) {
      // For protocols with multiple contracts (like AAVE), return the main pool contract
      const address = this.addresses[protocolKey as keyof typeof this.addresses];
      return typeof address === 'string' ? address : address.pool;
    }
    throw new Error(`Protocol ${protocol} not supported`);
  }

  /**
   * Get detailed information about a specific strategy from DeFiLlama
   */
  static async getStrategyDetails(
    protocol: string,
    asset: string
  ): Promise<StrategyDetails> {
    try {
      console.log(`\n===================== STRATEGY DETAILS REQUEST =====================`);
      console.log(`🔍 Getting detailed information for ${protocol} - ${asset} strategy`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      
      // Use DeFiLlama API through our proxy
      const encodedProtocol = encodeURIComponent(protocol);
      const encodedAsset = encodeURIComponent(asset);
      const apiUrl = `/api/defi/strategy?protocol=${encodedProtocol}&asset=${encodedAsset}`;
      
      console.log(`\n📡 API Call:`);
      console.log(`GET ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`\n📊 Response Data Overview:`);
      console.log(`Protocol: ${protocol}`);
      console.log(`Asset: ${asset}`);
      console.log(`Data received: ${data ? 'Yes' : 'No'}`);
      console.log(`Details available: ${data.detail ? 'Yes' : 'No'}`);
      
      // If we don't have a specific strategy endpoint yet, we'll fall back to using
      // the existing yield opportunity data and add placeholder values
      if (!data || !data.detail) {
        console.log(`\n⚠️ Using fallback strategy details - specific data not found`);
        console.log(`===================== END STRATEGY DETAILS REQUEST =====================\n`);
        return {
          protocol,
          asset,
          apy: 0, // This will be replaced with actual data from our database
          description: `Detailed information for ${protocol} - ${asset} isn't available yet. We're working on adding more detailed strategy information soon!`,
          url: `https://defillama.com/yields`,
          tvlUsd: 0,
          apyBase: 0,
          apyReward: 0
        };
      }
      
      // Log some key details from the response
      if (data.detail) {
        console.log(`\n✅ Strategy details summary:`);
        console.log(`APY: ${data.detail.apy || 0}%`);
        console.log(`TVL: $${data.detail.tvlUsd || 0}`);
        console.log(`Chain: ${data.detail.chain || 'Unknown'}`);
        if (data.detail.rewardTokens) console.log(`Reward Tokens: ${data.detail.rewardTokens.join(', ')}`);
        if (data.detail.underlyingTokens) console.log(`Underlying Tokens: ${data.detail.underlyingTokens.join(', ')}`);
      }
      
      console.log(`===================== END STRATEGY DETAILS REQUEST =====================\n`);
      
      return {
        protocol,
        asset,
        apy: data.detail.apy || 0,
        tvlUsd: data.detail.tvlUsd || 0,
        apyBase: data.detail.apyBase || 0,
        apyReward: data.detail.apyReward || 0,
        rewardTokens: data.detail.rewardTokens || [],
        underlyingTokens: data.detail.underlyingTokens || [],
        url: data.detail.url || `https://defillama.com/yields`,
        audits: data.detail.audits || 'Information not available',
        volumeUsd24h: data.detail.volumeUsd24h || 0,
        il7d: data.detail.il7d || 0,
        description: data.detail.description || `This is a yield opportunity from ${protocol} for the ${asset} token/asset. The strategy currently offers an APY of ${data.detail.apy || 0}% with a total value locked of $${(data.detail.tvlUsd || 0) / 1e6}M.`,
        poolMeta: data.detail.poolMeta || ''
      };
    } catch (error) {
      console.error('Error getting strategy details:', error);
      console.log(`===================== END STRATEGY DETAILS REQUEST =====================\n`);
      // Return basic information if API call fails
      return {
        protocol,
        asset,
        apy: 0,
        description: `Unable to fetch detailed information for this strategy. Please try again later.`
      };
    }
  }

  // Get token address for a specific asset
  private static getTokenAddress(asset: string): string {
    // This is a simplification - would need proper token address resolution
    // For now, we'll return a placeholder that will cause the code to look for the address elsewhere
    return `0x${Buffer.from(asset).toString('hex').padStart(40, '0').slice(0, 40)}`;
  }
} 