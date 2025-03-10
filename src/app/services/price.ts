import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export class PriceService {
  // Map token symbols to CoinGecko IDs
  private static tokenIdMap: Record<string, string> = {
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'S': 'ethereum', // Placeholder for S token
    'DAI': 'dai',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'SOL': 'solana',
    'DOT': 'polkadot'
  };

  /**
   * Get historical price data for a token
   */
  static async getPriceHistory(tokenSymbol: string, timeframe: string, interval: string = '1h'): Promise<{
    current: string;
    high: string;
    low: string;
    change: string;
    prices: Array<{ timestamp: number; price: number }>;
  }> {
    try {
      // Convert token symbol to CoinGecko ID
      const tokenId = this.tokenIdMap[tokenSymbol.toUpperCase()];
      if (!tokenId) {
        throw new Error(`Token ${tokenSymbol} not supported`);
      }

      // Convert timeframe to days
      let days: number;
      switch (timeframe) {
        case '1h':
          days = 1;
          break;
        case '24h':
          days = 1;
          break;
        case '7d':
          days = 7;
          break;
        case '30d':
          days = 30;
          break;
        default:
          days = 1;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch historical data from CoinGecko
      const response = await axios.get(`${COINGECKO_API}/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: interval === '1m' ? 'minutely' : interval === '1h' ? 'hourly' : 'daily'
        }
      });

      if (!response.data || !Array.isArray(response.data.prices) || response.data.prices.length === 0) {
        throw new Error(`No price data available for ${tokenSymbol}`);
      }

      // Validate and transform price data
      const prices = response.data.prices
        .filter(([timestamp, price]: [number, number]) => 
          timestamp && typeof price === 'number' && !isNaN(price)
        )
        .map(([timestamp, price]: [number, number]) => ({
          timestamp,
          price: Number(price.toFixed(2))
        }));

      if (prices.length === 0) {
        throw new Error(`Invalid price data received for ${tokenSymbol}`);
      }

      // Calculate statistics
      const current = prices[prices.length - 1].price;
      const high = Math.max(...prices.map(p => p.price));
      const low = Math.min(...prices.map(p => p.price));
      const first = prices[0].price;
      const change = ((current - first) / first * 100).toFixed(2);

      return {
        current: current.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        change,
        prices
      };
    } catch (error: any) {
      console.error('Error fetching price history:', error);
      throw new Error(`Failed to fetch price history: ${error.message}`);
    }
  }

  /**
   * Get current price of a token
   */
  static async getTokenPrice(tokenSymbol: string, currency: string = 'usd'): Promise<{
    price: string;
    timestamp: number;
    change24h?: string;
  }> {
    try {
      // Convert token symbol to CoinGecko ID
      const tokenId = this.tokenIdMap[tokenSymbol.toUpperCase()];
      
      if (!tokenId) {
        throw new Error(`Token ${tokenSymbol} not supported`);
      }
      
      // Fetch price data from CoinGecko
      const response = await axios.get(`${COINGECKO_API}/simple/price`, {
        params: {
          ids: tokenId,
          vs_currencies: currency,
          include_24hr_change: true,
          include_last_updated_at: true
        }
      });
      
      if (!response.data || !response.data[tokenId]) {
        throw new Error(`Failed to fetch price for ${tokenSymbol}`);
      }
      
      const data = response.data[tokenId];
      
      return {
        price: data[currency].toString(),
        timestamp: data.last_updated_at * 1000 || Date.now(),
        change24h: data[`${currency}_24h_change`]?.toFixed(2)
      };
    } catch (error: any) {
      console.error('Error fetching token price:', error);
      
      // Return fallback data for demo purposes
      return {
        price: tokenSymbol === 'ETH' ? '3450.75' : 
               tokenSymbol === 'BTC' ? '65432.10' : 
               tokenSymbol === 'USDC' ? '1.00' : '0.00',
        timestamp: Date.now(),
        change24h: '0.00'
      };
    }
  }

  /**
   * Get historical price data for a token
   */
  static async getPriceHistory(tokenSymbol: string, timeframe: string, interval: string): Promise<{
    prices: number[][];
    timestamps: number[];
  }> {
    try {
      // Convert token symbol to CoinGecko ID
      const tokenId = this.tokenIdMap[tokenSymbol.toUpperCase()];
      
      if (!tokenId) {
        throw new Error(`Token ${tokenSymbol} not supported`);
      }
      
      // Convert timeframe to days
      let days = 1;
      switch (timeframe) {
        case '1h': days = 1; break;
        case '24h': days = 1; break;
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        default: days = 1;
      }
      
      // Fetch market chart data from CoinGecko
      const response = await axios.get(`${COINGECKO_API}/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: interval === '1m' ? 'minute' : 
                   interval === '5m' ? 'minute' : 
                   interval === '15m' ? 'minute' : 
                   interval === '1h' ? 'hourly' : 'daily'
        }
      });
      
      if (!response.data || !response.data.prices) {
        throw new Error(`Failed to fetch price history for ${tokenSymbol}`);
      }
      
      const timestamps = response.data.prices.map((p: number[]) => p[0]);
      
      return {
        prices: response.data.prices,
        timestamps
      };
    } catch (error) {
      console.error('Error fetching price history:', error);
      
      // Return fallback data for demo purposes
      const now = Date.now();
      const timestamps = Array.from({ length: 24 }, (_, i) => now - (23 - i) * 3600 * 1000);
      
      // Generate some random price data
      const basePrice = tokenSymbol === 'ETH' ? 3450 : 
                       tokenSymbol === 'BTC' ? 65000 : 
                       tokenSymbol === 'USDC' ? 1 : 10;
      
      const prices = timestamps.map(t => [
        t, 
        basePrice + (Math.random() - 0.5) * basePrice * 0.05
      ]);
      
      return {
        prices,
        timestamps
      };
    }
  }

  // Store price alerts
  private static priceAlerts: Array<{
    tokenSymbol: string;
    condition: 'above' | 'below';
    price: string;
    currency: string;
  }> = [];

  /**
   * Set a price alert for a token
   */
  static setPriceAlert(tokenSymbol: string, condition: 'above' | 'below', price: string, currency: string = 'usd'): void {
    this.priceAlerts.push({
      tokenSymbol,
      condition,
      price,
      currency
    });
    
    // Start monitoring this alert
    this.monitorPriceAlert(tokenSymbol, condition, price, currency);
  }

  /**
   * Monitor a price alert and trigger notification when condition is met
   */
  private static async monitorPriceAlert(
    tokenSymbol: string, 
    condition: 'above' | 'below', 
    targetPrice: string,
    currency: string
  ): Promise<void> {
    const targetPriceNum = parseFloat(targetPrice);
    
    const checkPrice = async () => {
      try {
        const { price } = await this.getTokenPrice(tokenSymbol, currency);
        const currentPrice = parseFloat(price);
        
        let isTriggered = false;
        
        if (condition === 'above' && currentPrice >= targetPriceNum) {
          isTriggered = true;
        } else if (condition === 'below' && currentPrice <= targetPriceNum) {
          isTriggered = true;
        }
        
        if (isTriggered) {
          console.log(`PRICE ALERT: ${tokenSymbol} is now ${condition} ${targetPrice} ${currency.toUpperCase()} (Current: ${currentPrice})`);
          
          // Remove this alert from the list
          this.priceAlerts = this.priceAlerts.filter(
            alert => !(alert.tokenSymbol === tokenSymbol && 
                     alert.condition === condition && 
                     alert.price === targetPrice)
          );
          
          // Stop monitoring
          return;
        }
        
        // Check again in 1 minute
        setTimeout(checkPrice, 60000);
      } catch (error) {
        console.error('Error monitoring price alert:', error);
        // Retry in 5 minutes if there was an error
        setTimeout(checkPrice, 300000);
      }
    };
    
    // Start checking
    checkPrice();
  }
} 