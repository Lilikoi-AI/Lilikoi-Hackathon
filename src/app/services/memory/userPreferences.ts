import { ethers } from 'ethers';

export interface UserPreference {
  riskPreference?: 'low' | 'medium' | 'high';
  minTVL?: string;
  minAPY?: string;
  maxAPY?: string;
  preferredAssets?: string[];
  preferredProtocols?: string[];
  investmentAmount?: string;
  lastUpdated: number;
}

export interface UserInvestmentHistory {
  protocol: string;
  asset: string;
  amount: string;
  timestamp: number;
  txHash?: string;
}

export interface UserMemory {
  preferences: UserPreference;
  investmentHistory: UserInvestmentHistory[];
  recentSearches: string[];
  lastInteraction: number;
}

/**
 * UserPreferenceStore manages user preferences and investment history
 * for personalized investment suggestions
 */
export class UserPreferenceStore {
  private static instance: UserPreferenceStore;
  private userMemory: Map<string, UserMemory> = new Map();
  
  // Private constructor for singleton pattern
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): UserPreferenceStore {
    if (!UserPreferenceStore.instance) {
      UserPreferenceStore.instance = new UserPreferenceStore();
    }
    return UserPreferenceStore.instance;
  }
  
  /**
   * Initialize user memory if it doesn't exist
   */
  private initUserMemory(walletAddress: string): void {
    if (!this.userMemory.has(walletAddress)) {
      this.userMemory.set(walletAddress, {
        preferences: {
          lastUpdated: Date.now()
        },
        investmentHistory: [],
        recentSearches: [],
        lastInteraction: Date.now()
      });
    }
  }
  
  /**
   * Get user preferences
   */
  public getUserPreferences(walletAddress: string): UserPreference {
    this.initUserMemory(walletAddress);
    return this.userMemory.get(walletAddress)!.preferences;
  }
  
  /**
   * Update user preferences
   */
  public updateUserPreferences(walletAddress: string, preferences: Partial<UserPreference>): void {
    this.initUserMemory(walletAddress);
    const currentPrefs = this.userMemory.get(walletAddress)!.preferences;
    
    // Convert comma-separated strings to arrays if needed
    if (typeof preferences.preferredAssets === 'string') {
      preferences.preferredAssets = preferences.preferredAssets.split(',').map(a => a.trim());
    }
    
    if (typeof preferences.preferredProtocols === 'string') {
      preferences.preferredProtocols = preferences.preferredProtocols.split(',').map(p => p.trim());
    }
    
    this.userMemory.get(walletAddress)!.preferences = {
      ...currentPrefs,
      ...preferences,
      lastUpdated: Date.now()
    };
    
    console.log(`Updated preferences for ${walletAddress}:`, this.userMemory.get(walletAddress)!.preferences);
  }
  
  /**
   * Add investment to history
   */
  public addInvestmentToHistory(
    walletAddress: string, 
    protocol: string, 
    asset: string, 
    amount: string,
    txHash?: string
  ): void {
    this.initUserMemory(walletAddress);
    const history = this.userMemory.get(walletAddress)!.investmentHistory;
    
    history.push({
      protocol,
      asset,
      amount,
      timestamp: Date.now(),
      txHash
    });
    
    // Keep only the last 10 investments
    if (history.length > 10) {
      history.shift();
    }
    
    this.userMemory.get(walletAddress)!.lastInteraction = Date.now();
  }
  
  /**
   * Get user investment history
   */
  public getInvestmentHistory(walletAddress: string): UserInvestmentHistory[] {
    this.initUserMemory(walletAddress);
    return this.userMemory.get(walletAddress)!.investmentHistory;
  }
  
  /**
   * Add search to recent searches
   */
  public addRecentSearch(walletAddress: string, search: string): void {
    this.initUserMemory(walletAddress);
    const searches = this.userMemory.get(walletAddress)!.recentSearches;
    
    // Don't add duplicate searches
    if (!searches.includes(search)) {
      searches.unshift(search);
      
      // Keep only the last 5 searches
      if (searches.length > 5) {
        searches.pop();
      }
    }
    
    this.userMemory.get(walletAddress)!.lastInteraction = Date.now();
  }
  
  /**
   * Get recent searches
   */
  public getRecentSearches(walletAddress: string): string[] {
    this.initUserMemory(walletAddress);
    return this.userMemory.get(walletAddress)!.recentSearches;
  }
  
  /**
   * Extract preferences from user message
   */
  public extractPreferencesFromMessage(message: string): Partial<UserPreference> {
    const preferences: Partial<UserPreference> = {};
    
    // Extract risk preference
    const riskMatch = message.match(/\b(low|medium|high)\s+risk\b/i);
    if (riskMatch) {
      preferences.riskPreference = riskMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
    }
    
    // Extract minimum TVL
    const tvlMatch = message.match(/\bminimum\s+tvl\s+of\s+\$?(\d+(?:\.\d+)?)\s*(?:million|m|k|thousand)?\b/i);
    if (tvlMatch) {
      let value = parseFloat(tvlMatch[1]);
      if (tvlMatch[0].toLowerCase().includes('million') || tvlMatch[0].toLowerCase().includes('m')) {
        value *= 1000000;
      } else if (tvlMatch[0].toLowerCase().includes('thousand') || tvlMatch[0].toLowerCase().includes('k')) {
        value *= 1000;
      }
      preferences.minTVL = value.toString();
    }
    
    // Extract APY range
    const minApyMatch = message.match(/\bminimum\s+(?:apy|yield|return)\s+of\s+(\d+(?:\.\d+)?)\s*%?\b/i);
    if (minApyMatch) {
      preferences.minAPY = minApyMatch[1];
    }
    
    const maxApyMatch = message.match(/\bmaximum\s+(?:apy|yield|return)\s+of\s+(\d+(?:\.\d+)?)\s*%?\b/i);
    if (maxApyMatch) {
      preferences.maxAPY = maxApyMatch[1];
    }
    
    // Extract preferred assets
    const assetMatch = message.match(/\bprefer(?:red)?\s+(?:assets|tokens)?\s*(?:like|such as)?\s+([A-Za-z0-9,\s]+)(?:\.|$)/i);
    if (assetMatch) {
      preferences.preferredAssets = assetMatch[1].split(/,|\s+and\s+/).map(a => a.trim()).filter(a => a.length > 0);
    }
    
    // Extract preferred protocols
    const protocolMatch = message.match(/\bprefer(?:red)?\s+(?:protocols|platforms)?\s*(?:like|such as)?\s+([A-Za-z0-9,\s]+)(?:\.|$)/i);
    if (protocolMatch) {
      preferences.preferredProtocols = protocolMatch[1].split(/,|\s+and\s+/).map(p => p.trim()).filter(p => p.length > 0);
    }
    
    // Extract investment amount
    const amountMatch = message.match(/\b(?:invest|investing|investment|allocate|allocation)\s+(?:of)?\s*\$?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand|m|million|usd|dollars)?\b/i);
    if (amountMatch) {
      let value = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (amountMatch[0].toLowerCase().includes('million') || amountMatch[0].toLowerCase().includes('m')) {
        value *= 1000000;
      } else if (amountMatch[0].toLowerCase().includes('thousand') || amountMatch[0].toLowerCase().includes('k')) {
        value *= 1000;
      }
      preferences.investmentAmount = value.toString();
    }
    
    return preferences;
  }
}

// Export singleton instance
export const userPreferenceStore = UserPreferenceStore.getInstance(); 