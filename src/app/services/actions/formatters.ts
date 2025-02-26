import { TokenBalance, LiquidityPool, YieldFarm, Transaction, StakeData } from './types';
import { getValidatorName } from '../../config/staking';

export function formatTokenBalance(balance: TokenBalance): string {
  return `Your ${balance.token} balance is ${balance.balance} (≈$${balance.usdValue})`;
}

export function formatLiquidityPools(pools: LiquidityPool[]): string {
  if (pools.length === 0) {
    return 'No liquidity pools found.';
  }

  const poolStrings = pools.map(pool => 
    `${pool.token0}/${pool.token1}:\n` +
    `• TVL: $${pool.tvl}\n` +
    `• APR: ${pool.apr}%\n` +
    `• 24h Volume: $${pool.volume24h}`
  );

  return 'Available Liquidity Pools:\n\n' + poolStrings.join('\n\n');
}

export function formatYieldFarms(farms: YieldFarm[]): string {
  if (farms.length === 0) {
    return 'No yield farms found.';
  }

  const farmStrings = farms.map(farm =>
    `${farm.name}:\n` +
    `• Token: ${farm.token}\n` +
    `• APY: ${farm.apy}%\n` +
    `• TVL: $${farm.tvl}\n` +
    `• Rewards: ${farm.rewards.join(', ')}`
  );

  return 'Active Yield Farms:\n\n' + farmStrings.join('\n\n');
}

export function formatTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) {
    return 'No transactions found.';
  }

  const txStrings = transactions.map(tx => {
    const date = new Date(tx.timestamp * 1000).toLocaleString();
    let details = '';
    
    switch (tx.type) {
      case 'swap':
        details = `${tx.details.fromAmount} ${tx.details.fromToken} → ${tx.details.toAmount} ${tx.details.toToken}`;
        break;
      case 'addLiquidity':
      case 'removeLiquidity':
        details = `${tx.details.token0Amount} ${tx.details.token0} + ${tx.details.token1Amount} ${tx.details.token1}`;
        break;
      case 'stake':
      case 'unstake':
        details = `${tx.details.amount} ${tx.details.token}`;
        break;
    }

    return `${date} - ${tx.type.toUpperCase()} (${tx.status}):\n${details}\nHash: ${tx.hash}`;
  });

  return 'Recent Transactions:\n\n' + txStrings.join('\n\n');
}

export function formatStakeData(stakeData: StakeData[]): string {
  if (stakeData.length === 0) {
    return 'No stake data found.';
  }

  const stakeStrings = stakeData.map(stake =>
    `${stake.token} Validator:\n` +
    `• APR: ${stake.apr}%\n` +
    `• TVL: $${stake.tvl}`
  );

  return 'Available Validators:\n\n' + stakeStrings.join('\n\n');
}

export const formatStakingResponse = (action: string, params: any, result: any) => {
  switch (action) {
    case 'stakeTokens':
      return `Successfully staked ${params.amount} S tokens to ${getValidatorName(parseInt(params.validatorId))}. Transaction hash: ${result.hash}`;
    case 'claimSRewards':
      return `Successfully claimed rewards from ${getValidatorName(parseInt(params.validatorId))}. Transaction hash: ${result.hash}`;
    case 'unstakeSTokens':
      return `Successfully unstaked ${params.amount} S tokens from ${getValidatorName(parseInt(params.validatorId))}. Transaction hash: ${result.hash}`;
    default:
      return `Transaction completed. Hash: ${result.hash}`;
  }
};

export const formatBridgeResponse = (params: any, result: any) => {
  const tokenType = params.tokenAddress === '0x0000000000000000000000000000000000000000' 
    ? 'native tokens'
    : `tokens (${params.tokenAddress})`;

  return `Successfully initiated bridge of ${params.amount} ${tokenType} from ${params.fromChain} to ${params.toChain}. Transaction hash: ${result.hash}`;
};