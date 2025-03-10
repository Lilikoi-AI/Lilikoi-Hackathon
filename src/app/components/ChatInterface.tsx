/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { AbiCoder, ethers } from 'ethers';
import { useEthersSigner } from '@/app/hooks/useEthersSigner';
import { ETH_CONTRACTS, SONIC_CONTRACTS } from '../constants/contract-addresses';
import { BRIDGE_ABI, ERC20_ABI, STATE_ORACLE_ABI, TOKEN_DEPOSIT_ABI, TOKEN_PAIRS_ABI } from '../constants/sonic-abis';
import { fetchValidatorsList } from '../services/actions/api';
import { STAKING_CONFIG } from '../config/staking';
import { ValidatorInfo } from '../services/actions/types';
import { StakingService } from '../services/staking';
import { formatEther, parseEther } from 'viem';
import { Position } from '../../types/position';

interface Message {
  role: 'user' | 'assistant'
  content: string
  validatorButtons?: ValidatorInfo[]
}

// Network RPC endpoints
const ETHEREUM_RPC = "https://eth-mainnet.g.alchemy.com/v2/RTdxwy09IcN2eTRQHBJw-Ve3_kij5z0O";
const SONIC_RPC = "https://rpc.soniclabs.com";

// Initialize providers
const ethProvider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
const sonicProvider = new ethers.JsonRpcProvider(SONIC_RPC);

// Add ValidatorButton component
const ValidatorButton = ({ validator, onSelect }: { validator: ValidatorInfo, onSelect: (id: number) => void }) => (
  <button
    onClick={() => onSelect(validator.validatorId)}
    className="w-full mb-2 p-4 bg-gradient-to-r from-gray-800 to-purple-900/50 rounded-xl border border-purple-500/30 
               hover:from-purple-900/50 hover:to-gray-800 transition-all duration-200 text-left group"
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-purple-200">Validator #{validator.validatorId}</span>
          <span className={`px-2 py-1 rounded-full text-xs ${validator.status === 1 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {validator.status === 1 ? '🟢 Active' : '🔴 Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div className="text-purple-300">Total Stake: <span className="text-white">{validator.totalStake} S</span></div>
          <div className="text-purple-300">APR: <span className="text-white">{validator.apr.toFixed(2)}%</span></div>
          <div className="text-purple-300">Uptime: <span className="text-white">{validator.uptime.toFixed(2)}%</span></div>
          <div className="text-purple-300">Commission: <span className="text-white">{validator.commission.toFixed(2)}%</span></div>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-pink-400">Stake →</span>
      </div>
    </div>
  </button>
);

export default function ChatInterface() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const signer = useEthersSigner() as ethers.JsonRpcSigner;
  const [answer, setAnswer] = useState<string>('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Example queries organized by category
  const exampleQueriesMap = {
    staking: [
      "What validators are available for staking?",
      "I want to stake 1 S with validator #13",
      "Show me my staking positions",
      "I want to unstake my tokens"
    ],
    bridging: [
      "Bridge 1 USDC.e from sonic to polygon",
      "Bridge 10 USDC to Ethereum"
    ],
    tokens: [
      "Show me my token balances",
      "What is the token address of usdc.e on sonic",
      
    ],
    prices: [
      "What's the current price of ETH?",
      "What is the price of USDC.e on sonic?",
      
    ],
    
    
  };

  // Dropdown button component
  const DropdownButton = ({ category, isActive, onClick }: { category: string, isActive: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`relative px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200  text-white
                  ${isActive 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-purple-500 text-white hover:bg-purple-500/20'}`}
    >
      <div className="flex items-center gap-2">
        {category.charAt(0).toUpperCase() + category.slice(1)}
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );

  // Example query button component
  const ExampleQueryButton = ({ query, onClick }: { query: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 text-sm text-left text-purple-200 hover:bg-purple-500/20 rounded-lg transition-all"
    >
    <span className= "text-white">
      {query}
    </span>
    </button>
  );

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chainId = await publicClient?.getChainId();
      // Send to router
      const routerResponse = await fetch('/api/router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: {
            chainId,
            walletAddress: address,
            isTestnet: process.env.NODE_ENV === 'development'
          }
        })
      });

      if (!routerResponse.ok) {
        throw new Error('Router request failed');
      }

      const routerResult = await routerResponse.json();
      console.log("in frontend:", routerResult);

      if (routerResult.error) {
        throw new Error(routerResult.error);
      }

      // Handle getTokenBalanceOnChain action
      if (routerResult.action === "getTokenBalanceOnChain") {
        try {
          const { chainName, tokenSymbol } = routerResult.parameters;
          
          setAnswer(`Checking your ${tokenSymbol} balance on ${chainName}...`);
          
          if (!publicClient || !walletClient || !address) {
            throw new Error('Wallet not connected');
          }
          
          // Import necessary functions
          const { getDebridgeChainId } = await import('../services/actions/debridge-token');
          const { fetchWalletTokens } = await import('../services/actions/api');
          
          // Get chain ID from chain name
          const chainId = getDebridgeChainId(chainName);
          if (!chainId) {
            throw new Error(`Invalid chain name: ${chainName}`);
          }
          
          // Fetch tokens from the wallet on the specified chain
          console.log(`Fetching tokens for wallet ${address} on chain ${chainId}`);
          const tokens = await fetchWalletTokens(address, chainId);
          
          // Find the specific token
          const token = tokens.find(t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase());
          
          if (!token) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `You don't have any ${tokenSymbol} tokens on ${chainName}.`
            }]);
            setAnswer('');
            return;
          }
          
          // Construct response message
          const message = `Your ${token.symbol} (${token.name}) balance on ${chainName}: ${token.balance}`;
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting token balance on chain:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get token balance'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle validator list request first
      if (routerResult.action === "getValidatorsList") {
        try {
          setAnswer("Fetching validators list...");
          const validatorsList = await fetchValidatorsList();
          
          // Add the validators to the message with a new property
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Click on a validator to start staking:',
            validatorButtons: validatorsList
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error fetching validators:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to fetch validators list'}`
          }]);
          return;
        }
      }

      // Handle staking action
      if (routerResult.action === "stakeTokens") {
        try {
          const { validatorId, amount } = routerResult.parameters;
          setAnswer(`Initiating staking of ${amount} S tokens to validator #${validatorId}...`);
          
          if (!publicClient || !walletClient) {
            throw new Error('Wallet not connected');
          }
          
          const staking = new StakingService(publicClient, walletClient);
          const hash = await staking.stakeTokens(parseInt(validatorId), amount);
          
          const message = `Successfully initiated staking of ${amount} S tokens to validator #${validatorId}.\nTransaction hash: ${hash}`;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer(''); // Clear loading message
          return;
        } catch (error: any) {
          console.error('Staking failed:', error);
          const errorMessage = error.message || 'Failed to stake tokens';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${errorMessage}. Please make sure you have enough S tokens and have approved the transaction.`
          }]);
          setAnswer(''); // Clear loading message
          return;
        }
      }

      // Handle getLiquidityPools action
      if (routerResult.action === "getLiquidityPools") {
        try {
          setAnswer("Fetching available liquidity pools...");
          
          const { getLiquidityPools } = await import('../services/actions/handlers');
          const pools = await getLiquidityPools();
          
          const poolsMessage = pools.map(pool => {
            return `${pool.token0}/${pool.token1}:\n` +
                   `• Total Liquidity: $${pool.totalLiquidity}\n` +
                   `• 24h Volume: $${pool.volume24h}\n` +
                   `• APR: ${pool.apr}%`;
          }).join('\n\n');
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Available Liquidity Pools:\n\n${poolsMessage}`
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error fetching liquidity pools:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to fetch liquidity pools'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getYieldFarms action
      if (routerResult.action === "getYieldFarms") {
        try {
          setAnswer("Fetching yield farming opportunities...");
          
          const { getYieldFarms } = await import('../services/actions/handlers');
          const farms = await getYieldFarms();
          
          const farmsMessage = farms.map(farm => {
            return `${farm.name}:\n` +
                   `• Token Pair: ${farm.tokenPair}\n` +
                   `• APR: ${farm.apr}%\n` +
                   `• TVL: $${farm.tvl}\n` +
                   `• Rewards: ${farm.rewards}`;
          }).join('\n\n');
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Available Yield Farms:\n\n${farmsMessage}`
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error fetching yield farms:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to fetch yield farms'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getPriceHistory action
      if (routerResult.action === "getPriceHistory") {
        try {
          const { tokenSymbol, timeframe = '24h', interval = '1h' } = routerResult.parameters;
          
          if (!tokenSymbol) {
            throw new Error('Please specify a token symbol');
          }

          setAnswer(`Fetching price history for ${tokenSymbol.toUpperCase()}...`);

          const { PriceService } = await import('../services/price');
          const history = await PriceService.getPriceHistory(tokenSymbol, timeframe, interval);

          if (!history || !history.prices || history.prices.length === 0) {
            throw new Error(`No price data available for ${tokenSymbol.toUpperCase()}`);
          }

          // Format timestamps to readable dates
          const formatDate = (timestamp: number) => {
            try {
              const date = new Date(timestamp);
              return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            } catch (e) {
              return 'Invalid Date';
            }
          };

          // Get price points for the message (limit to 5 points for readability)
          const pricePoints = history.prices
            .filter((p) => p && p.timestamp && !isNaN(p.price))
            .filter((_, index, array) => index % Math.ceil(array.length / 5) === 0)
            .slice(0, 5)
            .map(p => {
              const formattedDate = formatDate(p.timestamp);
              const formattedPrice = p.price.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              });
              return `${formattedDate}: ${formattedPrice}`;
            });

          if (pricePoints.length === 0) {
            throw new Error(`Unable to format price data for ${tokenSymbol.toUpperCase()}`);
          }

          const formatPrice = (price: string | number) => {
            const num = typeof price === 'string' ? parseFloat(price) : price;
            return num.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            });
          };

          const message = `Price history for ${tokenSymbol.toUpperCase()} (${timeframe}):\n\n` +
                         `Summary:\n` +
                         `• Current Price: ${formatPrice(history.current)}\n` +
                         `• Highest: ${formatPrice(history.high)}\n` +
                         `• Lowest: ${formatPrice(history.low)}\n` +
                         `• Price Change: ${history.change}%\n\n` +
                         `Price Points:\n${pricePoints.map(p => `• ${p}`).join('\n')}`;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting price history:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get price history'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle setPriceAlert action
      if (routerResult.action === "setPriceAlert") {
        try {
          const { tokenSymbol, price, condition } = routerResult.parameters;
          setAnswer(`Setting price alert for ${tokenSymbol}...`);

          const { PriceService } = await import('../services/price');
          await PriceService.setPriceAlert(tokenSymbol, parseFloat(price), condition);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Successfully set price alert for ${tokenSymbol} ${condition} $${price}`
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error setting price alert:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to set price alert'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getGasPrice action
      if (routerResult.action === "getGasPrice") {
        try {
          const { chain = 'ethereum' } = routerResult.parameters;
          setAnswer(`Fetching current gas prices for ${chain}...`);

          const { GasService } = await import('../services/gas');
          const gas = await GasService.getGasPrice(chain);

          const message = `Current gas prices on ${chain}:\n` +
                         `• Fast: ${gas.fast} gwei\n` +
                         `• Standard: ${gas.standard} gwei\n` +
                         `• Slow: ${gas.slow} gwei`;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting gas price:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get gas price'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle estimateGasCost action
      if (routerResult.action === "estimateGasCost") {
        try {
          const { operation, chain = 'ethereum' } = routerResult.parameters;
          setAnswer(`Estimating gas cost for ${operation} on ${chain}...`);

          const { GasService } = await import('../services/gas');
          const estimate = await GasService.estimateGasCost(operation, chain);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Estimated gas cost for ${operation} on ${chain}: $${estimate.usd} (${estimate.eth} ETH)`
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error estimating gas cost:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to estimate gas cost'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getGasHistory action
      if (routerResult.action === "getGasHistory") {
        try {
          const { timeframe = '24h', chain = 'ethereum' } = routerResult.parameters;
          setAnswer(`Fetching gas price history for ${chain}...`);

          const { GasService } = await import('../services/gas');
          const history = await GasService.getGasHistory(chain, timeframe);

          const message = `Gas price history for ${chain} (${timeframe}):\n` +
                         `• Current: ${history.current} gwei\n` +
                         `• Average: ${history.average} gwei\n` +
                         `• Highest: ${history.highest} gwei\n` +
                         `• Lowest: ${history.lowest} gwei`;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting gas history:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get gas history'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getPortfolioOverview action
      if (routerResult.action === "getPortfolioOverview") {
        try {
          if (!address) throw new Error('Wallet not connected');
          setAnswer("Analyzing your portfolio...");

          const { PortfolioService } = await import('../services/portfolio');
          const overview = await PortfolioService.getPortfolioOverview(address);

          const message = `Portfolio Overview:\n` +
                         `• Total Value: $${overview.totalValue}\n` +
                         `• 24h Change: ${overview.change24h}%\n` +
                         `• Number of Assets: ${overview.assetCount}\n` +
                         `• Top Holdings:\n${overview.topHoldings.map(h => 
                           `  - ${h.token}: $${h.value} (${h.percentage}%)`
                         ).join('\n')}`;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting portfolio overview:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get portfolio overview'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getAssetAllocation action
      if (routerResult.action === "getAssetAllocation") {
        try {
          if (!address) throw new Error('Wallet not connected');
          setAnswer("Analyzing your asset allocation...");

          const { PortfolioService } = await import('../services/portfolio');
          const allocation = await PortfolioService.getAssetAllocation(address);

          const message = `Asset Allocation:\n` +
                         `By Chain:\n${allocation.byChain.map(c => 
                           `• ${c.chain}: ${c.percentage}%`
                         ).join('\n')}\n\n` +
                         `By Asset Type:\n${allocation.byType.map(t => 
                           `• ${t.type}: ${t.percentage}%`
                         ).join('\n')}`;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting asset allocation:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get asset allocation'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getInvestmentSuggestions action
      if (routerResult.action === "getInvestmentSuggestions") {
        try {
          const { riskLevel = 'moderate' } = routerResult.parameters;
          setAnswer("Generating investment suggestions...");

          const { PortfolioService } = await import('../services/portfolio');
          const suggestions = await PortfolioService.getInvestmentSuggestions(riskLevel);

          const message = `Investment Suggestions (${riskLevel} risk):\n\n` +
                         suggestions.map((s, i) => 
                           `${i + 1}. ${s.name}\n` +
                           `• Type: ${s.type}\n` +
                           `• Expected APR: ${s.expectedReturn}%\n` +
                           `• Risk Level: ${s.risk}\n` +
                           `• Recommendation: ${s.recommendation}`
                         ).join('\n\n');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting investment suggestions:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get investment suggestions'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getTransactionHistory action
      if (routerResult.action === "getTransactionHistory") {
        try {
          if (!address) throw new Error('Wallet not connected');
          setAnswer("Fetching your transaction history...");

          const { getTransactionHistory } = await import('../services/actions/handlers');
          const history = await getTransactionHistory(address);

          const message = `Recent Transactions:\n\n` +
                         history.map(tx => 
                           `${tx.date}\n` +
                           `• Type: ${tx.type}\n` +
                           `• Amount: ${tx.amount} ${tx.token}\n` +
                           `• Status: ${tx.status}\n` +
                           `• Hash: ${tx.hash}`
                         ).join('\n\n');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error fetching transaction history:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to fetch transaction history'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getTokenPrice action
      if (routerResult.action === "getTokenPrice") {
        try {
          const { tokenSymbol, currency = 'USD' } = routerResult.parameters;
          setAnswer(`Fetching current price for ${tokenSymbol}...`);

          // Import PriceService
          const { PriceService } = await import('../services/price');

          const { price, change24h } = await PriceService.getTokenPrice(
            tokenSymbol,
            currency.toLowerCase()
          );

          const message = `Current price of ${tokenSymbol}: ${price} ${currency} (24h change: ${change24h || '0.00'}%)`;
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error getting token price:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to get token price'}. Please try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle getUserStakingPositions action
      if (routerResult.action === "getUserStakingPositions") {
        try {
          setAnswer("Fetching your staking positions...");
          
          if (!publicClient || !walletClient || !address) {
            throw new Error('Wallet not connected');
          }

          const staking = new StakingService(publicClient, walletClient);
          const currentEpoch = await staking.getCurrentEpoch();
          const validatorIds = await staking.getEpochValidatorIDs(currentEpoch as bigint);
          
          const positions = await Promise.all((validatorIds as bigint[]).map(async (id: bigint) => {
            const stake = await staking.getStake(address as `0x${string}`, Number(id));
            const rewards = await staking.getPendingRewards(address as `0x${string}`, Number(id));
            
            return {
              validatorId: Number(id),
              stakedAmount: formatEther(stake as bigint),
              pendingRewards: formatEther(rewards as bigint)
            };
          }));

          const activePositions = positions.filter((p: { stakedAmount: string }) => parseFloat(p.stakedAmount) > 0);

          if (activePositions.length === 0) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'You currently have no active staking positions.'
            }]);
            setAnswer('');
            return;
          }

          const positionsMessage = activePositions.map((pos: { validatorId: number, stakedAmount: string, pendingRewards: string }) => 
            `Validator #${pos.validatorId}\n` +
            `• Staked Amount: ${pos.stakedAmount} S\n` +
            `• Pending Rewards: ${pos.pendingRewards} S`
          ).join('\n\n');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Your Active Staking Positions:\n\n${positionsMessage}`
          }]);
          setAnswer('');
          return;
        } catch (error: any) {
          console.error('Error fetching staking positions:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${error.message || 'Failed to fetch staking positions'}. Please ensure you are connected to the Sonic network and try again.`
          }]);
          setAnswer('');
          return;
        }
      }

      // Handle unstaking action
      if (routerResult.action === "unstakeSTokens") {
        try {
          const { validatorId, amount } = routerResult.parameters;
          setAnswer(`Checking your staking positions...`);
          
          if (!publicClient || !walletClient || !address) {
            throw new Error('Wallet not connected');
          }
          
          const staking = new StakingService(publicClient, walletClient);
          
          // First get current epoch and active validators
          const currentEpoch = await staking.getCurrentEpoch();
          const validatorIds = await staking.getEpochValidatorIDs(currentEpoch as bigint);
          
          // Find the user's position with the specified validator
          const stake = await staking.getStake(address as `0x${string}`, parseInt(validatorId));
          const amountToUnstake = parseEther(amount);
          
          if ((stake as bigint) === BigInt(0)) {
            throw new Error(`You don't have any tokens staked with validator #${validatorId}`);
          }
          
          if ((stake as bigint) < amountToUnstake) {
            throw new Error(`Insufficient stake. You only have ${formatEther(stake as bigint)} S staked with validator #${validatorId}`);
          }
          
          // Check if validator is active in current epoch
          if (!(validatorIds as bigint[]).map((id: bigint) => Number(id)).includes(parseInt(validatorId))) {
            throw new Error(`Validator #${validatorId} is not active in the current epoch`);
          }
          
          // Get next wrID and undelegate
          setAnswer(`Preparing withdrawal request...`);
          const hash = await staking.unstake(parseInt(validatorId), amount);
          
          const message = `Successfully initiated unstaking of ${amount} S tokens from validator #${validatorId}.\nTransaction hash: ${hash}\n\nNote: Your tokens will be locked for 2 epochs before they can be withdrawn.`;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer(''); // Clear loading message
          return;
        } catch (error: any) {
          console.error('Unstaking failed:', error);
          const errorMessage = error.message || 'Failed to unstake tokens';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${errorMessage}. Please try again.`
          }]);
          setAnswer(''); // Clear loading message
          return;
        }
      }

      // Handle claim rewards action
      if (routerResult.action === "claimSRewards") {
        try {
          const { validatorId } = routerResult.parameters;
          setAnswer(`Initiating claim of rewards from validator #${validatorId}...`);
          
          if (!publicClient || !walletClient) {
            throw new Error('Wallet not connected');
          }
          
          const staking = new StakingService(publicClient, walletClient);
          
          // Check pending rewards first
          const rewards = await staking.getPendingRewards(address as `0x${string}`, parseInt(validatorId));
          if (rewards === BigInt(0)) {
            throw new Error('No rewards to claim');
          }
          
          const hash = await staking.claimRewards(parseInt(validatorId));
          
          const message = `Successfully claimed rewards from validator #${validatorId}.\nTransaction hash: ${hash}`;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer(''); // Clear loading message
          return;
        } catch (error: any) {
          console.error('Claiming rewards failed:', error);
          const errorMessage = error.message || 'Failed to claim rewards';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${errorMessage}. Please try again.`
          }]);
          setAnswer(''); // Clear loading message
          return;
        }
      }

      // Handle bridge operations
      if (routerResult.parameters?.fromChain === "ETHEREUM") {
        try {
          // USDC details
          const USDC_ADDRESS = routerResult.parameters.tokenAddress;
          const amount = ethers.parseUnits(routerResult.parameters.amount, 6); 

          // 1. Bridge USDC to Sonic
          setAnswer("Initiating bridge to Sonic...");
          const deposit = await bridgeToSonic(signer, USDC_ADDRESS, amount);
          setAnswer(`Deposit successful: ${deposit.transactionHash}`);

          // 2. Claim USDC on Sonic
          setAnswer("Waiting for state update and claiming on Sonic...");
          const claimTx = await claimOnSonic(signer, deposit.transactionHash, deposit.blockNumber, deposit.depositId);
          setAnswer(`Claim successful: ${claimTx}`);
        } catch (error: any) {
          console.error("Bridge operation failed:", error?.message);     
          throw error;
        }
      }

      if(routerResult.parameters?.fromChain === "SONIC") {
        try {
          // USDC details
          const USDC_ADDRESS = routerResult.parameters.tokenAddress;
          const amount = ethers.parseUnits(routerResult.parameters.amount, 6); // USDC has 6 decimals

          // 1. Bridge USDC to Ethereum
          console.log(USDC_ADDRESS, amount);
          setAnswer("Initiating bridge to Ethereum...");
          const withdrawal = await bridgeToEthereum(walletClient, USDC_ADDRESS, amount);
          console.log(`Withdrawal successful: ${withdrawal.transactionHash}`);

          // 2. Claim USDC on Ethereum
          setAnswer("Waiting for state update and claiming on Ethereum...");
          const claimTx = await claimOnEthereum(walletClient, withdrawal.transactionHash, withdrawal.blockNumber, withdrawal.withdrawalId);
          console.log(`Claim successful: ${claimTx}`);
          setAnswer(`Claim successful: ${claimTx}`);
        } catch (error: any) {
          console.error("Bridge operation failed:", error?.message);
          throw error;
        }
      }

      // Handle bridgeWithDeBridge action
      if (routerResult.action === "bridgeWithDeBridge") {
        try {
          const { sourceChain, destinationChain, tokenSymbol, amount } = routerResult.parameters;
          
          // Validate parameters
          if (!sourceChain || !destinationChain || !tokenSymbol || !amount) {
            throw new Error('Missing required parameters for bridging. Please provide source chain, destination chain, token symbol, and amount.');
          }
          
          // Step 1: First show the user what tokens they have on the source chain
          setAnswer(`Preparing to bridge ${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain}...`);
          
          if (!publicClient || !walletClient || !address) {
            throw new Error('Wallet not connected');
          }
          
          // Get the current chain ID
          const currentChainId = await publicClient.getChainId();
          console.log(`Current chain ID: ${currentChainId}`);
          
          // Get the chain ID for the source chain
          const { getDebridgeChainId, DEBRIDGE_CHAIN_IDS } = await import('../services/actions/debridge-token');
          
          // Normalize chain names for consistency
          const normalizedSourceChain = sourceChain.toUpperCase();
          const normalizedDestChain = destinationChain.toUpperCase();
          
          console.log(`Attempting to bridge from ${normalizedSourceChain} to ${normalizedDestChain}`);
          console.log(`Available chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`);
          
          // Special handling for Sonic chain
          // Sonic has chain ID 146 in standard format but 100000014 in deBridge format
          let isSonicChain = false;
          if (normalizedSourceChain === 'SONIC') {
            // If we're bridging from Sonic, check if current chain is Sonic (146)
            isSonicChain = currentChainId === 146;
            console.log(`Detected Sonic chain: ${isSonicChain}`);
          }
          
          const sourceChainId = getDebridgeChainId(normalizedSourceChain);
          const destChainId = getDebridgeChainId(normalizedDestChain);
          
          console.log(`Source chain ID: ${sourceChainId}, Destination chain ID: ${destChainId}`);
          
          if (!sourceChainId) {
            throw new Error(`Unsupported source chain: ${sourceChain}. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`);
          }
          
          if (!destChainId) {
            throw new Error(`Unsupported destination chain: ${destinationChain}. Supported chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`);
          }
          
          // Step 1: Show the user's tokens on the source chain
          setAnswer(`Checking your tokens on ${sourceChain}...`);
          
          // Import the API function to fetch wallet tokens
          const { fetchWalletTokens } = await import('../services/actions/api');
          const { formatWalletTokens } = await import('../services/actions/formatters');
          
          // Fetch tokens from the wallet on the source chain
          console.log(`Fetching tokens for wallet ${address} on chain ${sourceChainId}`);
          const tokens = await fetchWalletTokens(address, sourceChainId);
          
          // Check if the user has the token they want to bridge
          const tokenToBridge = tokens.find(token => token.symbol.toLowerCase() === tokenSymbol.toLowerCase());
          if (!tokenToBridge) {
            throw new Error(`You don't have any ${tokenSymbol} tokens on ${sourceChain}. Please check your wallet and try again.`);
          }
          
          // Check if the user has enough of the token
          if (parseFloat(tokenToBridge.balance) < parseFloat(amount)) {
            throw new Error(`Insufficient balance. You only have ${tokenToBridge.balance} ${tokenSymbol} on ${sourceChain}, but you're trying to bridge ${amount} ${tokenSymbol}.`);
          }
          
          // Show the user their tokens
          const walletMessage = `Your tokens on ${sourceChain}:\n\n` +
            tokens.map((token, index) => 
              `${index + 1}. ${token.symbol} (${token.name}): ${token.balance}`
            ).join('\n') +
            `\n\nProceeding with bridging ${amount} ${tokenSymbol} to ${destinationChain}...`;
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: walletMessage
          }]);
          
          // Step 2: Get token addresses on both chains
          setAnswer(`Looking up token addresses for ${tokenSymbol} on ${sourceChain} and ${destinationChain}...`);
          
          // Import the actions handler
          const { actions } = await import('../services/actions');
          const getTokenAddressAction = actions.find(action => action.name === 'getTokenAddress');
          
          if (!getTokenAddressAction) {
            throw new Error('getTokenAddress action not found');
          }
          
          // Call getTokenAddress action for source chain
          const sourceTokenResult = await getTokenAddressAction.handler({
            chainId: sourceChainId,
            symbol: tokenSymbol
          }, { 
            publicClient, 
            walletClient, 
            walletAddress: address 
          });
          
          if (sourceTokenResult.type === 'ERROR' || !sourceTokenResult.data.address) {
            throw new Error(`Token ${tokenSymbol} not found on ${sourceChain}: ${sourceTokenResult.message}`);
          }
          
          const sourceTokenAddress = sourceTokenResult.data.address;
          const isNativeToken = sourceTokenResult.data.isNativeToken;
          const decimals = sourceTokenResult.data.decimals || 18;
          
          console.log(`Found token address on source chain: ${sourceTokenAddress}`);
          console.log(`Token ${tokenSymbol} has ${decimals} decimals`);
          
          if (isNativeToken) {
            console.log(`${tokenSymbol} is a native token`);
          }
          
          // Call getTokenAddress action for destination chain
          let destTokenAddress = null;
          let destTokenDecimals = null;
          let isDestNative = false;
          
          try {
            setAnswer(`Found source token. Now checking destination chain...`);
            console.log(`Fetching token address for ${tokenSymbol} on ${destinationChain} (chain ID: ${destChainId})`);
            
            const destTokenResult = await getTokenAddressAction.handler({
              chainId: destChainId,
              symbol: tokenSymbol
            }, { 
              publicClient, 
              walletClient, 
              walletAddress: address 
            });
            
            if (destTokenResult.type !== 'ERROR' && destTokenResult.data.address) {
              destTokenAddress = destTokenResult.data.address;
              destTokenDecimals = destTokenResult.data.decimals || 18;
              isDestNative = destTokenResult.data.isNativeToken;
              console.log(`Found token address on destination chain: ${destTokenAddress}`);
            } else {
              console.warn(`Token ${tokenSymbol} not found on destination chain ${destinationChain}. It may be created during bridging.`);
            }
          } catch (error) {
            console.warn(`Could not fetch token ${tokenSymbol} on destination chain ${destinationChain}:`, error);
            // Continue even if destination token address is not found
          }
          
          // Show token addresses to the user
          const addressesMessage = `Token addresses for ${tokenSymbol}:\n\n` +
            `On ${sourceChain}: ${sourceTokenAddress}${isNativeToken ? ' (Native Token)' : ''}\n` +
            `Decimals: ${decimals}\n\n` +
            (destTokenAddress 
              ? `On ${destinationChain}: ${destTokenAddress}${isDestNative ? ' (Native Token)' : ''}\n` +
                `Decimals: ${destTokenDecimals}\n\n`
              : `On ${destinationChain}: Will be created during bridging\n\n`) +
            `Preparing to bridge ${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain}...`;
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: addressesMessage
          }]);
          
          // Step 3: Perform the actual bridging
          const walletActionMessage = `🔐 **Wallet Action Required**\n\nYou will now need to approve the following in your wallet:\n\n` +
            (isNativeToken 
              ? `1. Transaction to bridge ${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain} (with increased gas limit for reliability)\n` 
              : `1. Transaction to approve ${tokenSymbol} for bridging\n2. Transaction to bridge ${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain} (with increased gas limit for reliability)\n`) +
            `\nPlease check your wallet and approve the transaction(s) to continue.`;
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: walletActionMessage
          }]);
          
          setAnswer(`Waiting for you to approve the transaction in your wallet...`);
          
          // Initialize deBridge service
          const { DeBridgeService } = await import('../services/debridge');
          const deBridgeService = new DeBridgeService(publicClient, walletClient);
          
          // Prepare bridge parameters
          const bridgeParams = {
            sourceChain,
            destinationChain,
            tokenSymbol,
            amount,
            receiver: address,
            tokenAddress: sourceTokenAddress
          };
          
          // Execute bridge transaction
          try {
            // Log the wallet address being used
            console.log(`Using wallet address: ${address} for bridging`);
            
            // Get initial token balance before bridging
            const initialBalance = await checkTokenBalance(address, sourceChain, tokenSymbol);
            console.log(`Initial ${tokenSymbol} balance: ${initialBalance}`);
            
            // Execute the bridge transaction
            const txHash = await deBridgeService.bridgeWithDeBridge(bridgeParams);
            
            // Show immediate confirmation message after user signs the transaction
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ **Transaction Submitted!** Your bridging request is now being processed. This typically takes 5-10 minutes to complete.\n\nTransaction hash: ${txHash}\n\nYou can track the status of your transaction on the deBridge Explorer: https://explorer.debridge.finance/tx/${txHash}`
            }]);
            
            // Show bridging in progress message
            setAnswer(`Checking if bridging was successful...`);
            
            // Wait a moment to allow the transaction to be processed
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Check if the transaction was successful by verifying the token balance
            try {
              const newBalance = await checkTokenBalance(address, sourceChain, tokenSymbol);
              console.log(`New ${tokenSymbol} balance after transaction: ${newBalance}`);
              
              // If balance hasn't changed, the transaction might have failed
              if (newBalance === initialBalance) {
                console.warn(`Token balance hasn't changed after transaction. Transaction might have failed.`);
                
                // Check transaction receipt for errors
                const provider = new ethers.JsonRpcProvider(sourceChain === 'ETHEREUM' ? ETHEREUM_RPC : SONIC_RPC);
                const receipt = await provider.getTransactionReceipt(txHash);
                
                if (receipt && receipt.status === 0) {
                  throw new Error(`Transaction failed on-chain. The approval may have succeeded, but the bridging transaction failed. This could be due to insufficient gas, contract errors, or other issues.`);
                }
                
                // If we can't determine failure from receipt, warn the user but continue
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `⚠️ **Warning**: Your transaction was submitted (hash: ${txHash}), but your token balance hasn't changed. This might indicate that the bridging operation failed.\n\nPossible reasons:\n1. The transaction might still be processing\n2. There might have been a contract error\n3. The gas limit might have been too low\n\nYou can check the transaction status on the block explorer: ${sourceChain === 'ETHEREUM' ? `https://etherscan.io/tx/${txHash}` : `https://explorer.sonic.ooo/tx/${txHash}`}\n\nIf the transaction failed, you may need to try again with a higher gas limit or contact support.`
                }]);
                
                // Don't start polling if we suspect failure
                setAnswer('');
                return;
              }
              
              // If we get here, the balance has changed, so the transaction was likely successful
              // Construct initial response message
              let message = `✅ **Bridging Initiated Successfully**\n\n`;
              message += `Successfully initiated bridging of ${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain}.\n\n`;
              message += `Source token address: ${sourceTokenAddress}${isNativeToken ? ' (Native Token)' : ''}\n`;
              message += `Token decimals: ${decimals}\n`;
              
              if (destTokenAddress) {
                message += `Destination token address: ${destTokenAddress}${isDestNative ? ' (Native Token)' : ''}\n`;
              } else {
                message += `Destination token address: Will be created during bridging\n`;
              }
              
              message += `\nTransaction hash: ${txHash}\n\n`;
              message += `**Bridging Status: In Progress**\n`;
              message += `Your bridging transaction has been submitted and is being processed. This typically takes 5-10 minutes to complete.\n\n`;
              message += `What's happening now:\n`;
              message += `1. Waiting for transaction finality on ${sourceChain} (1-2 minutes)\n`;
              message += `2. deBridge validators will confirm the transaction\n`;
              message += `3. Funds will be released on ${destinationChain}\n\n`;
              message += `You can track the status of your transaction on the deBridge Explorer: https://explorer.debridge.finance/tx/${txHash}`;
              
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: message
              }]);
              
              // Start polling for transaction status
              startBridgeStatusPolling(txHash, sourceChain, destinationChain, tokenSymbol, amount);
            } catch (balanceCheckError) {
              console.error('Error checking balance after transaction:', balanceCheckError);
              
              // If we can't check the balance, proceed with normal flow but warn the user
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ **Warning**: Your transaction was submitted (hash: ${txHash}), but we couldn't verify if your token balance has changed. The bridging operation might still be in progress or might have failed.\n\nYou can check the transaction status on the block explorer: ${sourceChain === 'ETHEREUM' ? `https://etherscan.io/tx/${txHash}` : `https://explorer.sonic.ooo/tx/${txHash}`}\n\nWe'll continue to monitor the bridging process, but please be aware there might be issues.`
              }]);
              
              // Start polling for transaction status
              startBridgeStatusPolling(txHash, sourceChain, destinationChain, tokenSymbol, amount);
            }
          } catch (error: any) {
            console.error('Bridging failed:', error);
            const errorMessage = error.message || 'Failed to bridge tokens';
            
            // Check for specific error types and provide more helpful messages
            let userFriendlyMessage = errorMessage;
            
            if (errorMessage.includes('Amount too low')) {
              // This is a minimum amount error
              userFriendlyMessage = `${errorMessage}\n\nWhen bridging from Sonic to Ethereum, you need to send a larger amount to cover the transaction fees on Ethereum. We recommend at least 5 USDC for this route.`;
            } else if (errorMessage.includes('extra fees')) {
              // This is the error from the screenshot
              userFriendlyMessage = `The transaction would cost more in fees than the value being transferred. When bridging from Sonic to Ethereum, you need to send a larger amount (at least 5 USDC) to make it economically viable.`;
            } else if (errorMessage.includes('execution reverted')) {
              // This is the error we're seeing in the screenshot
              console.error('Transaction execution reverted:', error);
              
              // Log any additional error data
              if (error.data) {
                console.error('Error data:', error.data);
              }
              
              userFriendlyMessage = `The transaction was reverted by the blockchain. This could be due to several reasons:\n\n` +
                `1. The amount you're trying to bridge is too small compared to the gas fees\n` +
                `2. There might be an issue with the contract interaction\n` +
                `3. The blockchain network might be congested\n\n` +
                `Please try again with a larger amount (at least 5 USDC when bridging to Ethereum) or try again later.`;
            } else if (errorMessage.includes('insufficient funds')) {
              userFriendlyMessage = `You don't have enough funds to complete this transaction. Please ensure you have enough ${tokenSymbol} and native tokens to cover gas fees.`;
            } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
              userFriendlyMessage = `Transaction was rejected. You declined the transaction in your wallet.`;
            }
            
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `❌ **Error**: ${userFriendlyMessage}`
            }]);
            setAnswer(''); // Clear loading message
            return;
          }
          
          return;
        } catch (error: any) {
          console.error('Bridging failed:', error);
          const errorMessage = error.message || 'Failed to bridge tokens';
          
          // Check for specific error types and provide more helpful messages
          let userFriendlyMessage = errorMessage;
          
          if (errorMessage.includes('Amount too low')) {
            // This is a minimum amount error
            userFriendlyMessage = `${errorMessage}\n\nWhen bridging from Sonic to Ethereum, you need to send a larger amount to cover the transaction fees on Ethereum. We recommend at least 5 USDC for this route.`;
          } else if (errorMessage.includes('extra fees')) {
            // This is the error from the screenshot
            userFriendlyMessage = `The transaction would cost more in fees than the value being transferred. When bridging from Sonic to Ethereum, you need to send a larger amount (at least 5 USDC) to make it economically viable.`;
          } else if (errorMessage.includes('execution reverted')) {
            // This is the error we're seeing in the screenshot
            console.error('Transaction execution reverted:', error);
            
            // Log any additional error data
            if (error.data) {
              console.error('Error data:', error.data);
            }
            
            userFriendlyMessage = `The transaction was reverted by the blockchain. This could be due to several reasons:\n\n` +
              `1. The amount you're trying to bridge is too small compared to the gas fees\n` +
              `2. There might be an issue with the contract interaction\n` +
              `3. The blockchain network might be congested\n\n` +
              `Please try again with a larger amount (at least 5 USDC when bridging to Ethereum) or try again later.`;
          } else if (errorMessage.includes('insufficient funds')) {
            userFriendlyMessage = `You don't have enough funds to complete this transaction. Please ensure you have enough ${tokenSymbol} and native tokens to cover gas fees.`;
          } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
            userFriendlyMessage = `Transaction was rejected. You declined the transaction in your wallet.`;
          }
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ **Error**: ${userFriendlyMessage}`
          }]);
          setAnswer(''); // Clear loading message
          return;
        }
      }
      
      // Handle getTokenAddress action
      if (routerResult.action === "getTokenAddress") {
        try {
          const { chainId, symbol } = routerResult.parameters;
          
          // Validate parameters
          if (!chainId || !symbol) {
            throw new Error('Missing required parameters. Please provide chain ID and token symbol.');
          }
          
          setAnswer(`Fetching address for ${symbol} on chain ${chainId}...`);
          
          const { getTokenAddress, getTokenDecimals } = await import('../services/actions/debridge-token');
          
          // Fetch token address
          console.log(`Fetching token address for ${symbol} on chain ${chainId}`);
          const tokenAddress = await getTokenAddress(chainId, symbol);
          
          if (!tokenAddress) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Token ${symbol} not found on chain ${chainId}`
            }]);
            setAnswer('');
            return;
          }
          
          console.log(`Found token address: ${tokenAddress}`);
          
          // Check if this is a native token
          const isNativeToken = tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
          if (isNativeToken) {
            console.log(`${symbol} is a native token`);
          }
          
          // Fetch token decimals
          console.log(`Fetching decimals for ${symbol} on chain ${chainId}`);
          const decimals = await getTokenDecimals(chainId, symbol) || 18;
          console.log(`Token ${symbol} has ${decimals} decimals`);
          
          // Construct response message
          let message = `Token Information for ${symbol} on chain ${chainId}:\n\n`;
          message += `Address: ${tokenAddress}${isNativeToken ? ' (Native Token)' : ''}\n`;
          message += `Decimals: ${decimals}`;
            
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: message
          }]);
          setAnswer(''); // Clear loading message
          return;
        } catch (error: any) {
          console.error('Error getting token address:', error);
          const errorMessage = error.message || 'Failed to get token address';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${errorMessage}`
          }]);
          setAnswer(''); // Clear loading message
          return;
        }
      }
      
      // Handle getWalletTokens action
      if (routerResult.action === "getWalletTokens") {
        try {
          const { chainId } = routerResult.parameters;
          const chainName = chainId === "100000014" ? "Sonic" : 
                           chainId === "1" ? "Ethereum" : 
                           `Chain ${chainId}`;
          
          setAnswer(`Fetching your tokens on ${chainName}...`);
          
          if (!address) {
            throw new Error('Wallet not connected. Please connect your wallet to view your tokens.');
          }
          
          // Import the API function to fetch wallet tokens
          const { fetchWalletTokens } = await import('../services/actions/api');
          const { formatWalletTokens } = await import('../services/actions/formatters');
          
          // Fetch tokens from the wallet
          console.log(`Fetching tokens for wallet ${address} on chain ${chainId}`);
          const tokens = await fetchWalletTokens(address, chainId || "100000014");
          
          if (!tokens || tokens.length === 0) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `No tokens found in your wallet on ${chainName}.`
            }]);
            setAnswer('');
            return;
          }
          
          // Format the tokens for display
          const formattedMessage = formatWalletTokens(tokens);
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: formattedMessage
          }]);
          setAnswer(''); // Clear loading message
          return;
        } catch (error: any) {
          console.error('Error fetching wallet tokens:', error);
          const errorMessage = error.message || 'Failed to fetch tokens in your wallet';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${errorMessage}. Please ensure your wallet is connected and try again.`
          }]);
          setAnswer(''); // Clear loading message
          return;
        }
      }

    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process request'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  async function bridgeToSonic (walletClient: ethers.Wallet, tokenAddress: string, amount: bigint) {
    const tokenPairs = new ethers.Contract(ETH_CONTRACTS.TOKEN_PAIRS, TOKEN_PAIRS_ABI, ethProvider);
    const mintedToken = await tokenPairs.originalToMinted(tokenAddress);
    console.log(mintedToken);
    if (mintedToken === ethers.ZeroAddress) {
      throw new Error("Token not supported");
    }

    // 2. Approve token spending
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, walletClient);
    const approveTx = await token.approve(ETH_CONTRACTS.TOKEN_DEPOSIT, amount);
    await approveTx.wait();

    // 3. Deposit tokens
    const deposit = new ethers.Contract(ETH_CONTRACTS.TOKEN_DEPOSIT, TOKEN_DEPOSIT_ABI, walletClient);
    const tx = await deposit.deposit(Date.now(), tokenAddress, amount);
    console.log(tx);
    const receipt = await tx.wait();
    console.log(receipt);

    return {
      transactionHash: receipt.hash,
      mintedToken,
      blockNumber: receipt.blockNumber,
      depositId: receipt.events.find((e: { event: string; }) => e.event === 'Deposit').args.id
    };
  }

  async function waitForStateUpdate(depositBlockNumber: bigint) {
    const stateOracle = new ethers.Contract(SONIC_CONTRACTS.STATE_ORACLE, STATE_ORACLE_ABI, sonicProvider);
    while (true) {
      const currentBlockNum = await stateOracle.lastBlockNum();
      if (currentBlockNum >= depositBlockNumber) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 30000));
    } 
  }

  async function generateProof(depositId: number) {
    // Generate storage slot for deposit
    const abiCoder = AbiCoder.defaultAbiCoder();

    const encodedData = abiCoder.encode(['uint256', 'uint8'], [depositId, 7]);
    const storageSlot = ethers.keccak256(encodedData);

    // Get proof from Ethereum node
    const proof = await ethProvider.send("eth_getProof", [
      ETH_CONTRACTS.TOKEN_DEPOSIT,
      [storageSlot],
      "latest"
    ]);

    // Encode proof in required format
    return ethers.encodeRlp([
      ethers.encodeRlp(proof.accountProof),
      ethers.encodeRlp(proof.storageProof[0].proof)
    ]);
  }

  async function claimOnSonic(walletClient: ethers.Wallet, depositTxHash: string, depositBlockNumber: bigint) {
    console.log("Waiting for state oracle update...");
    setAnswer("Waiting for state oracle update...");
    await waitForStateUpdate(depositBlockNumber);

    // 2. Generate proof
    console.log("Generating proof...");
    const proof = await generateProof(depositId);

    // 3. Claim tokens with proof
    const bridge = new ethers.Contract(SONIC_CONTRACTS.BRIDGE, BRIDGE_ABI, sonicSigner);
    const tx = await bridge.claim(depositTxHash, proof);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  async function bridgeToEthereum(walletClient: ethers.Wallet, tokenAddress: string, amount: bigint) {
    // 1. Check if token is supported
    const tokenPairs = new ethers.Contract(SONIC_CONTRACTS.TOKEN_PAIRS, TOKEN_PAIRS_ABI, sonicProvider);
    const originalToken = await tokenPairs.mintedToOriginal(tokenAddress);
    if (originalToken === ethers.ZeroAddress) {
      throw new Error("Token not supported");
    }

    // 2. Initiate withdrawal
    const bridge = new ethers.Contract(SONIC_CONTRACTS.BRIDGE, BRIDGE_ABI, walletClient);
    const tx = await bridge.withdraw(Date.now(), originalToken, amount);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      withdrawalId: receipt.events.find((e: { event: string; }) => e.event === 'Withdrawal').args.id
    };
  }

  async function waitForEthStateUpdate(withdrawalBlockNumber: bigint) {
    const stateOracle = new ethers.Contract(ETH_CONTRACTS.STATE_ORACLE, STATE_ORACLE_ABI, ethProvider);

    while (true) {
      const currentBlockNum = await stateOracle.lastBlockNum();
      if (currentBlockNum >= withdrawalBlockNumber) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
    }
  }

  async function generateWithdrawalProof(withdrawalId: bigint) {
    // Generate storage slot for withdrawal
    const abiCoder = AbiCoder.defaultAbiCoder();

    const encodedData = abiCoder.encode(['uint256', 'uint8'], [withdrawalId, 1]);
    const storageSlot = ethers.keccak256(encodedData);

    // Get proof from Sonic node
    const proof = await sonicProvider.send("eth_getProof", [
      SONIC_CONTRACTS.BRIDGE,
      [storageSlot],
      "latest"
    ]);

    // Encode proof in required format
    return ethers.encodeRlp([
      ethers.encodeRlp(proof.accountProof),
      ethers.encodeRlp(proof.storageProof[0].proof)
    ]);
  }

  async function claimOnEthereum(walletClient: ethers.Wallet, withdrawalTxHash: string, withdrawalBlockNumber: bigint, withdrawalId: bigint) {
    // 1. Wait for state oracle update
    console.log("Waiting for state oracle update...");
    await waitForEthStateUpdate(withdrawalBlockNumber);

    // 2. Generate proof
    console.log("Generating proof...");
    const proof = await generateWithdrawalProof(withdrawalId);

    // 3. Claim tokens with proof
    const deposit = new ethers.Contract(ETH_CONTRACTS.TOKEN_DEPOSIT, TOKEN_DEPOSIT_ABI, walletClient);
    const tx = await deposit.claim(withdrawalTxHash, proof);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  // Function to poll for bridge transaction status
  async function startBridgeStatusPolling(txHash: string, sourceChain: string, destinationChain: string, tokenSymbol: string, amount: string) {
    let attempts = 0;
    const maxAttempts = 20; // Poll for up to ~10 minutes (20 attempts * 30 seconds)
    
    const pollStatus = async () => {
      attempts++;
      
      try {
        // Update the status message based on the time elapsed
        if (attempts <= 2) {
          setAnswer(`Bridging in progress... Waiting for transaction finality on ${sourceChain}. Your funds are secure and the process typically takes 5-10 minutes to complete.`);
        } else if (attempts <= 5) {
          setAnswer(`Bridging in progress... Transaction confirmed on ${sourceChain}. Waiting for deBridge validators to process. Your funds are secure and will arrive in your destination wallet shortly.`);
        } else {
          setAnswer(`Bridging in progress... Waiting for funds to be released on ${destinationChain}. Your funds are secure and will appear in your wallet soon.`);
        }
        
        // At specific intervals, provide more detailed updates to the user
        if (attempts === 4) {
          // After ~2 minutes, provide a status update
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**Bridging Status Update**\n\nYour bridging transaction (${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain}) is being processed.\n\nThe transaction has been confirmed on ${sourceChain} and deBridge validators are now processing it. Your funds are secure and this step typically takes a few minutes.\n\nYou can track the status of your transaction on the deBridge Explorer: https://explorer.debridge.finance/tx/${txHash}`
          }]);
        } else if (attempts === 10) {
          // After ~5 minutes, provide another status update
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**Bridging Status Update**\n\nYour bridging transaction (${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain}) is still in progress.\n\nThe transaction is being processed by deBridge validators and will soon be released on ${destinationChain}. Your funds are secure and this process can take up to 10 minutes in total.\n\nYou can track the status of your transaction on the deBridge Explorer: https://explorer.debridge.finance/tx/${txHash}`
          }]);
        }
        
        // If we've reached max attempts, show a final message
        if (attempts >= maxAttempts) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**Bridging Status Update**\n\nYour bridging transaction (${amount} ${tokenSymbol} from ${sourceChain} to ${destinationChain}) is still in progress.\n\nBridging can sometimes take longer than expected due to network conditions. Your funds are secure and will arrive at your destination address once the process completes.\n\nTo check the current status of your transaction, please visit the deBridge Explorer: https://explorer.debridge.finance/tx/${txHash}\n\nIf you need further assistance, you can contact deBridge support through their Discord: https://discord.com/invite/debridge`
          }]);
          setAnswer(''); // Clear loading message
          return; // Stop polling
        }
        
        // Continue polling
        setTimeout(pollStatus, 30000); // Poll every 30 seconds
      } catch (error) {
        console.error('Error polling bridge status:', error);
        // Continue polling despite errors
        setTimeout(pollStatus, 30000);
      }
    };
    
    // Start polling
    pollStatus();
  }

  // Function to check token balance
  async function checkTokenBalance(walletAddress: string, chainName: string, tokenSymbol: string): Promise<string> {
    try {
      // Import necessary functions
      const { getDebridgeChainId } = await import('../services/actions/debridge-token');
      const { fetchWalletTokens } = await import('../services/actions/api');
      
      // Get chain ID
      const chainId = getDebridgeChainId(chainName);
      if (!chainId) {
        throw new Error(`Unknown chain: ${chainName}`);
      }
      
      // Fetch tokens
      const tokens = await fetchWalletTokens(walletAddress, chainId);
      
      // Find the token
      const token = tokens.find(t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase());
      if (!token) {
        return '0';
      }
      
      return token.balance;
    } catch (error) {
      console.error(`Error checking token balance:`, error);
      throw error;
    }
  }

  const handleValidatorSelect = (validatorId: number) => {
    setInput(`I want to stake 1 S tokens with validator #${validatorId}`);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-gray-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-2xl">
      {/* Example Queries with Dropdowns */}
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex justify-center gap-4">
          {Object.keys(exampleQueriesMap).map((category) => (
            <div key={category} className="relative">
              <DropdownButton
                category={category}
                isActive={activeDropdown === category}
                onClick={() => setActiveDropdown(activeDropdown === category ? null : category)}
              />
              {activeDropdown === category && (
                <div className="absolute z-10 w-64 mt-2 py-2 bg-gray-800/95 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-xl">
                  <div className="max-h-48 overflow-y-auto">
                    {exampleQueriesMap[category as keyof typeof exampleQueriesMap].map((query, idx) => (
                      <ExampleQueryButton
                        key={idx}
                        query={query}
                        onClick={() => {
                          setInput(query);
                          setActiveDropdown(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-4 shadow-lg backdrop-blur-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-pink-500 via-purple-600 to-pink-500 text-white border border-pink-400/20'
                  : 'bg-gradient-to-br from-gray-800 via-purple-900/50 to-gray-800 text-purple-50 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
              }`}
            >
              <div className="whitespace-pre-wrap text-white">{message.content}</div>
              {message.validatorButtons && (
                <div className="mt-4 space-y-2">
                  {message.validatorButtons.map((validator) => (
                    <ValidatorButton
                      key={validator.validatorId}
                      validator={validator}
                      onSelect={handleValidatorSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl p-4 bg-gradient-to-br from-gray-800 via-purple-900/50 to-gray-800 text-purple-50 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] shadow-lg animate-pulse backdrop-blur-sm">
              {answer}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="border-t border-purple-500/20 p-6 bg-gray-900/30">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about DeFi operations..."
            className="flex-1 rounded-xl border border-purple-500/20 bg-gray-800/50 p-4 text-purple-100 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
          >
            Enter
          </button>
        </div>
      </form>
    </div>
  )
}
