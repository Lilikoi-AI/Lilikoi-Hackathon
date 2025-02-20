import { TokenBalance, LiquidityPool, YieldFarm, Transaction } from './types';

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
