import { ethers } from 'ethers';
import { SONIC_RPC } from '../constants/rpc';

// Investment tracking interfaces
export interface Investment {
  id: string;
  protocol: string;
  asset: string;
  amount: string;
  timestamp: number;
  apy: number;
  txHash?: string;
  userAddress: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  returns?: {
    current: string;
    projected: {
      monthly: string;
      yearly: string;
    };
  };
}

export interface ReturnsEstimate {
  daily: string;
  weekly: string;
  monthly: string;
  yearly: string;
  compounded: {
    monthly: string;
    yearly: string;
  };
}

export class InvestmentService {
  private static provider = new ethers.JsonRpcProvider(SONIC_RPC);
  
  // In-memory storage for active investments (in a real app, this would be a database)
  private static investments: Investment[] = [];
  
  /**
   * Track a new investment
   */
  static async trackInvestment(
    protocol: string,
    asset: string,
    amount: string,
    apy: number,
    userAddress: string,
    txHash?: string
  ): Promise<Investment> {
    const investment: Investment = {
      id: `${Date.now()}-${protocol}-${asset}`,
      protocol,
      asset,
      amount,
      timestamp: Date.now(),
      apy,
      txHash,
      userAddress,
      status: txHash ? 'active' : 'pending',
      returns: {
        current: '0',
        projected: {
          monthly: this.calculateReturns(amount, apy, 30).monthly,
          yearly: this.calculateReturns(amount, apy, 365).yearly
        }
      }
    };
    
    this.investments.push(investment);
    
    return investment;
  }
  
  /**
   * Calculate estimated returns for an investment
   */
  static calculateReturns(
    amount: string, 
    apy: number, 
    days: number = 365
  ): ReturnsEstimate {
    const principal = parseFloat(amount);
    
    // Convert APY to daily rate
    const dailyRate = apy / 100 / 365;
    
    // Simple interest calculations
    const dailyReturn = principal * dailyRate;
    const weeklyReturn = dailyReturn * 7;
    const monthlyReturn = dailyReturn * 30;
    const yearlyReturn = dailyReturn * 365;
    
    // Compound interest calculations (monthly compounding)
    const monthlyCompoundRate = Math.pow(1 + dailyRate, 30) - 1;
    const yearlyCompoundRate = Math.pow(1 + dailyRate, 365) - 1;
    
    const monthlyCompounded = principal * monthlyCompoundRate;
    const yearlyCompounded = principal * yearlyCompoundRate;
    
    return {
      daily: dailyReturn.toFixed(6),
      weekly: weeklyReturn.toFixed(6),
      monthly: monthlyReturn.toFixed(6),
      yearly: yearlyReturn.toFixed(6),
      compounded: {
        monthly: monthlyCompounded.toFixed(6),
        yearly: yearlyCompounded.toFixed(6)
      }
    };
  }
  
  /**
   * Get all investments for a user
   */
  static getUserInvestments(userAddress: string): Investment[] {
    return this.investments.filter(inv => inv.userAddress.toLowerCase() === userAddress.toLowerCase());
  }
  
  /**
   * Get details for a specific investment
   */
  static getInvestmentDetails(investmentId: string): Investment | null {
    return this.investments.find(inv => inv.id === investmentId) || null;
  }
  
  /**
   * Update investment status (e.g., when transaction confirms)
   */
  static updateInvestmentStatus(
    investmentId: string,
    status: 'pending' | 'active' | 'completed' | 'failed',
    txHash?: string
  ): Investment | null {
    const investment = this.investments.find(inv => inv.id === investmentId);
    
    if (!investment) {
      return null;
    }
    
    investment.status = status;
    if (txHash) {
      investment.txHash = txHash;
    }
    
    return investment;
  }
  
  /**
   * Simulate investment returns with different APYs and compounding frequencies
   */
  static simulateInvestment(
    amount: string,
    apy: number,
    days: number = 365,
    compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'none' = 'daily'
  ): {
    principal: string;
    finalAmount: string;
    totalReturns: string;
    returnPercentage: string;
  } {
    const principal = parseFloat(amount);
    let finalAmount: number;
    
    // Convert APY to daily rate
    const dailyRate = apy / 100 / 365;
    
    if (compoundingFrequency === 'none') {
      // Simple interest
      finalAmount = principal + (principal * dailyRate * days);
    } else {
      // Compound interest with different frequencies
      let periodsPerYear: number;
      switch (compoundingFrequency) {
        case 'daily':
          periodsPerYear = 365;
          break;
        case 'weekly':
          periodsPerYear = 52;
          break;
        case 'monthly':
          periodsPerYear = 12;
          break;
        default:
          periodsPerYear = 365;
      }
      
      const ratePerPeriod = apy / 100 / periodsPerYear;
      const periods = (periodsPerYear / 365) * days;
      
      finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
    }
    
    const totalReturns = finalAmount - principal;
    const returnPercentage = (totalReturns / principal) * 100;
    
    return {
      principal: principal.toFixed(6),
      finalAmount: finalAmount.toFixed(6),
      totalReturns: totalReturns.toFixed(6),
      returnPercentage: returnPercentage.toFixed(2)
    };
  }
} 