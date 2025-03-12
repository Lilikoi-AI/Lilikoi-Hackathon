import { ActionDefinition } from './types';
import { YieldService } from '../yield';
import { userPreferenceStore } from '../memory/userPreferences';

export const yieldActions: ActionDefinition[] = [
  {
    name: 'getYieldOpportunities',
    description: 'Get all available yield opportunities across Sonic DeFi protocols',
    parameters: {
      riskPreference: 'Risk preference (low, medium, high)',
      minTVL: 'Minimum TVL requirement in USD'
    },
    validate: (params) => ({
      isValid: true, // Optional parameters
      error: null
    }),
    handler: async (params) => {
      try {
        const opportunities = await YieldService.getYieldOpportunities();
        
        // Filter based on parameters if provided
        let filtered = opportunities;
        if (params.riskPreference) {
          filtered = filtered.filter(opp => opp.risk === params.riskPreference.toLowerCase());
        }
        if (params.minTVL) {
          filtered = filtered.filter(opp => BigInt(opp.tvl) >= BigInt(params.minTVL));
        }

        // Sort by APY
        filtered.sort((a, b) => b.apy - a.apy);

        return {
          type: 'YIELD_OPPORTUNITIES',
          data: { opportunities: filtered },
          message: `Found ${filtered.length} yield opportunities:\n${filtered.map(opp => 
            `${opp.protocol} - ${opp.asset}: ${opp.apy.toFixed(2)}% APY (Risk: ${opp.risk})`
          ).join('\n')}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error fetching yield opportunities: ${error.message}`
        };
      }
    }
  },
  {
    name: 'getBestYield',
    description: 'Get the best yield opportunity based on risk preference',
    parameters: {
      riskPreference: 'Risk preference (low, medium, high)',
      minTVL: 'Minimum TVL requirement in USD'
    },
    validate: (params) => ({
      isValid: !!params.riskPreference,
      error: !params.riskPreference ? 'Risk preference is required' : null
    }),
    handler: async (params) => {
      try {
        const bestYield = await YieldService.getBestYield(
          params.riskPreference.toLowerCase() as 'low' | 'medium' | 'high',
          params.minTVL
        );

        if (!bestYield) {
          return {
            type: 'NO_YIELD',
            data: { params },
            message: 'No yield opportunities found matching your criteria.'
          };
        }

        return {
          type: 'BEST_YIELD',
          data: { yield: bestYield },
          message: `Best yield opportunity:\n${bestYield.protocol} - ${bestYield.asset}\nAPY: ${bestYield.apy.toFixed(2)}%\nRisk Level: ${bestYield.risk}\nTVL: $${(Number(bestYield.tvl) / 1e6).toFixed(2)}M`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error finding best yield: ${error.message}`
        };
      }
    }
  },
  {
    name: 'allocateToYield',
    description: 'Allocate funds to a specific yield opportunity',
    parameters: {
      protocol: 'Protocol to allocate to (aave, euler, frax)',
      asset: 'Asset to allocate',
      amount: 'Amount to allocate'
    },
    validate: (params) => ({
      isValid: !!params.protocol && !!params.asset && !!params.amount,
      error: !params.protocol ? 'Protocol is required' :
             !params.asset ? 'Asset is required' :
             !params.amount ? 'Amount is required' : null
    }),
    handler: async (params, context) => {
      try {
        const success = await YieldService.allocateFunds(
          params.protocol.toLowerCase(),
          params.asset,
          params.amount,
          context.wallet
        );

        if (!success) {
          throw new Error('Transaction failed');
        }

        return {
          type: 'ALLOCATION_SUCCESS',
          data: { params },
          message: `Successfully allocated ${params.amount} ${params.asset} to ${params.protocol}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error allocating funds: ${error.message}`
        };
      }
    }
  },
  {
    name: 'checkYieldRebalance',
    description: 'Check if portfolio rebalancing is recommended based on current yields',
    parameters: {
      riskPreference: 'Risk preference (low, medium, high)'
    },
    validate: (params) => ({
      isValid: !!params.riskPreference,
      error: !params.riskPreference ? 'Risk preference is required' : null
    }),
    handler: async (params, context) => {
      try {
        // Get current allocation (this would come from user's portfolio)
        const currentAllocation = [
          { protocol: 'aave', asset: 'USDC', amount: '1000' },
          { protocol: 'euler', asset: 'stS', amount: '500' },
          { protocol: 'frax', asset: 'FRAX', amount: '750' }
        ];

        const { shouldRebalance, suggestion } = await YieldService.monitorYields(
          currentAllocation,
          params.riskPreference.toLowerCase() as 'low' | 'medium' | 'high'
        );

        if (!shouldRebalance) {
          return {
            type: 'NO_REBALANCE_NEEDED',
            data: { currentAllocation },
            message: 'Your current yield allocation is optimal.'
          };
        }

        return {
          type: 'REBALANCE_SUGGESTED',
          data: { suggestion },
          message: `Rebalancing suggested:\nMove funds from ${suggestion?.from.protocol} (${suggestion?.from.asset}) to ${suggestion?.to.protocol} (${suggestion?.to.asset})\nReason: ${suggestion?.reason}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error checking rebalance: ${error.message}`
        };
      }
    }
  },
  {
    name: 'getInvestmentSuggestions',
    description: 'Get personalized investment suggestions based on risk preference and custom criteria',
    parameters: {
      riskPreference: 'Risk preference (low, medium, high)',
      minTVL: 'Minimum TVL requirement in USD (optional)',
      minAPY: 'Minimum APY requirement in % (optional)',
      maxAPY: 'Maximum APY requirement in % (optional)',
      preferredAssets: 'Comma-separated list of preferred assets (optional)',
      preferredProtocols: 'Comma-separated list of preferred protocols (optional)',
      investmentAmount: 'Amount to invest in USD (optional)'
    },
    validate: (params) => ({
      isValid: !!params.riskPreference,
      error: !params.riskPreference ? 'Risk preference is required' : null
    }),
    handler: async (params, context) => {
      try {
        // Extract preferences from the message if available
        if (context.message) {
          const extractedPrefs = userPreferenceStore.extractPreferencesFromMessage(context.message);
          
          // Update params with extracted preferences if not explicitly provided
          if (extractedPrefs.riskPreference && !params.riskPreference) {
            params.riskPreference = extractedPrefs.riskPreference;
          }
          if (extractedPrefs.minTVL && !params.minTVL) {
            params.minTVL = extractedPrefs.minTVL;
          }
          if (extractedPrefs.minAPY && !params.minAPY) {
            params.minAPY = extractedPrefs.minAPY;
          }
          if (extractedPrefs.maxAPY && !params.maxAPY) {
            params.maxAPY = extractedPrefs.maxAPY;
          }
          if (extractedPrefs.preferredAssets && !params.preferredAssets) {
            params.preferredAssets = extractedPrefs.preferredAssets.join(',');
          }
          if (extractedPrefs.preferredProtocols && !params.preferredProtocols) {
            params.preferredProtocols = extractedPrefs.preferredProtocols.join(',');
          }
          if (extractedPrefs.investmentAmount && !params.investmentAmount) {
            params.investmentAmount = extractedPrefs.investmentAmount;
          }
        }
        
        // Get user preferences from store if wallet address is available
        if (context.walletAddress) {
          const userPrefs = userPreferenceStore.getUserPreferences(context.walletAddress);
          
          // Update params with stored preferences if not explicitly provided or extracted
          if (userPrefs.riskPreference && !params.riskPreference) {
            params.riskPreference = userPrefs.riskPreference;
          }
          if (userPrefs.minTVL && !params.minTVL) {
            params.minTVL = userPrefs.minTVL;
          }
          if (userPrefs.minAPY && !params.minAPY) {
            params.minAPY = userPrefs.minAPY;
          }
          if (userPrefs.maxAPY && !params.maxAPY) {
            params.maxAPY = userPrefs.maxAPY;
          }
          if (userPrefs.preferredAssets && !params.preferredAssets) {
            params.preferredAssets = userPrefs.preferredAssets.join(',');
          }
          if (userPrefs.preferredProtocols && !params.preferredProtocols) {
            params.preferredProtocols = userPrefs.preferredProtocols.join(',');
          }
          if (userPrefs.investmentAmount && !params.investmentAmount) {
            params.investmentAmount = userPrefs.investmentAmount;
          }
          
          // Store the search query
          if (context.message) {
            userPreferenceStore.addRecentSearch(context.walletAddress, context.message);
          }
          
          // Update user preferences with the current parameters
          userPreferenceStore.updateUserPreferences(context.walletAddress, {
            riskPreference: params.riskPreference as 'low' | 'medium' | 'high',
            minTVL: params.minTVL,
            minAPY: params.minAPY,
            maxAPY: params.maxAPY,
            preferredAssets: params.preferredAssets ? params.preferredAssets.split(',').map(a => a.trim()) : undefined,
            preferredProtocols: params.preferredProtocols ? params.preferredProtocols.split(',').map(p => p.trim()) : undefined,
            investmentAmount: params.investmentAmount
          });
        }

        const opportunities = await YieldService.getYieldOpportunities();
        
        // Filter based on risk preference
        let filtered = opportunities.filter(opp => 
          opp.risk === params.riskPreference.toLowerCase()
        );

        // Apply additional filters if provided
        if (params.minTVL) {
          filtered = filtered.filter(opp => 
            BigInt(opp.tvl) >= BigInt(params.minTVL)
          );
        }

        if (params.minAPY) {
          filtered = filtered.filter(opp => 
            opp.apy >= parseFloat(params.minAPY)
          );
        }

        if (params.maxAPY) {
          filtered = filtered.filter(opp => 
            opp.apy <= parseFloat(params.maxAPY)
          );
        }

        if (params.preferredAssets) {
          const assets = params.preferredAssets.split(',').map((a: string) => a.trim().toLowerCase());
          filtered = filtered.filter(opp => 
            assets.includes(opp.asset.toLowerCase())
          );
        }

        if (params.preferredProtocols) {
          const protocols = params.preferredProtocols.split(',').map((p: string) => p.trim().toLowerCase());
          filtered = filtered.filter(opp => 
            protocols.includes(opp.protocol.toLowerCase())
          );
        }

        // Sort by APY
        filtered.sort((a, b) => b.apy - a.apy);

        // Get user investment history if available
        let investmentHistory: Array<{
          protocol: string;
          asset: string;
          amount: string;
          timestamp: number;
          txHash?: string;
        }> = [];
        if (context.walletAddress) {
          investmentHistory = userPreferenceStore.getInvestmentHistory(context.walletAddress);
        }

        // Generate AI-powered suggestions
        const suggestions = filtered.map(opp => {
          let suggestion = `${opp.protocol} - ${opp.asset}:\n`;
          suggestion += `• APY: ${opp.apy.toFixed(2)}%\n`;
          suggestion += `• TVL: $${(Number(opp.tvl) / 1e6).toFixed(2)}M\n`;
          suggestion += `• Risk Level: ${opp.risk}\n`;

          // Add investment strategy based on risk preference
          if (params.investmentAmount) {
            const amount = parseFloat(params.investmentAmount);
            let allocation;
            
            switch (params.riskPreference.toLowerCase()) {
              case 'low':
                allocation = Math.min(amount * 0.3, amount); // Max 30% for low risk
                break;
              case 'medium':
                allocation = Math.min(amount * 0.5, amount); // Max 50% for medium risk
                break;
              case 'high':
                allocation = Math.min(amount * 0.7, amount); // Max 70% for high risk
                break;
              default:
                allocation = amount * 0.3; // Default to conservative allocation
            }
            
            suggestion += `• Recommended Allocation: $${allocation.toFixed(2)}\n`;
          }

          // Add strategy tips
          suggestion += '• Strategy: ';
          if (opp.apy > 20) {
            suggestion += 'Consider this a high-risk, high-reward opportunity. ';
            suggestion += 'Recommend small position size and close monitoring.\n';
          } else if (opp.apy > 10) {
            suggestion += 'Moderate yield opportunity with balanced risk-reward. ';
            suggestion += 'Suitable for diversifying your portfolio.\n';
          } else {
            suggestion += 'Stable yield opportunity with lower risk. ';
            suggestion += 'Good for core portfolio positions.\n';
          }

          // Add personalized note based on investment history
          const previousInvestment = investmentHistory.find(
            inv => inv.protocol.toLowerCase() === opp.protocol.toLowerCase() && 
                  inv.asset.toLowerCase() === opp.asset.toLowerCase()
          );
          
          if (previousInvestment) {
            const daysAgo = Math.floor((Date.now() - previousInvestment.timestamp) / (1000 * 60 * 60 * 24));
            suggestion += `• Note: You previously invested ${previousInvestment.amount} in this opportunity ${daysAgo} days ago.\n`;
          }

          return suggestion;
        });

        // Prepare response message
        let message = `Investment Suggestions for ${params.riskPreference.toUpperCase()} Risk Profile\n\n`;
        
        if (filtered.length === 0) {
          message += 'No opportunities found matching your criteria. Consider adjusting your filters.';
        } else {
          message += `Found ${filtered.length} opportunities matching your criteria:\n\n`;
          message += suggestions.join('\n');
          
          // Add portfolio advice
          message += '\nPortfolio Recommendations:\n';
          if (params.riskPreference === 'low') {
            message += '• Focus on stable, established protocols\n';
            message += '• Diversify across 3-5 different opportunities\n';
            message += '• Consider stablecoin-based strategies for reduced volatility\n';
          } else if (params.riskPreference === 'medium') {
            message += '• Balance between stable and higher-yield opportunities\n';
            message += '• Diversify across 4-6 different protocols\n';
            message += '• Mix of stablecoin and token-based strategies\n';
          } else {
            message += '• Include some higher-risk, higher-reward opportunities\n';
            message += '• Diversify across 5-8 different protocols\n';
            message += '• Consider newer protocols with higher yields\n';
          }
          
          // Add personalized recommendations based on history
          if (investmentHistory.length > 0) {
            message += '\nBased on your investment history:\n';
            
            // Check if user has a preference for certain protocols
            const protocolCounts = investmentHistory.reduce((acc: Record<string, number>, inv) => {
              acc[inv.protocol] = (acc[inv.protocol] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            const favoriteProtocol = Object.entries(protocolCounts)
              .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0];
            
            if (favoriteProtocol) {
              message += `• You seem to prefer ${favoriteProtocol[0]} - consider exploring their newer offerings\n`;
            }
            
            // Check if user has a preference for certain assets
            const assetCounts = investmentHistory.reduce((acc: Record<string, number>, inv) => {
              acc[inv.asset] = (acc[inv.asset] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            const favoriteAsset = Object.entries(assetCounts)
              .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0];
            
            if (favoriteAsset) {
              message += `• You've frequently invested in ${favoriteAsset[0]} - consider similar assets for diversification\n`;
            }
          }
          
          // Add recent searches context if available
          if (context.walletAddress) {
            const recentSearches = userPreferenceStore.getRecentSearches(context.walletAddress);
            if (recentSearches.length > 0) {
              message += '\nBased on your recent searches, you might also be interested in:\n';
              
              // Extract key terms from recent searches
              const terms = recentSearches.flatMap(search => {
                const words = search.toLowerCase().split(/\s+/);
                return words.filter(word => 
                  word.length > 3 && 
                  !['what', 'show', 'find', 'give', 'want', 'need', 'looking', 'about'].includes(word)
                );
              });
              
              // Count term frequency
              const termCounts = terms.reduce((acc, term) => {
                acc[term] = (acc[term] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              // Get top 3 terms
              const topTerms = Object.entries(termCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([term]) => term);
              
              // Suggest based on top terms
              topTerms.forEach(term => {
                const relatedOpportunities = opportunities.filter(opp => 
                  opp.protocol.toLowerCase().includes(term) || 
                  opp.asset.toLowerCase().includes(term)
                ).slice(0, 2);
                
                if (relatedOpportunities.length > 0) {
                  message += `• ${relatedOpportunities.map(opp => 
                    `${opp.protocol} - ${opp.asset} (${opp.apy.toFixed(2)}% APY)`
                  ).join(', ')}\n`;
                }
              });
            }
          }
        }

        return {
          type: 'INVESTMENT_SUGGESTIONS',
          data: { 
            opportunities: filtered,
            suggestions,
            riskPreference: params.riskPreference,
            userHistory: investmentHistory
          },
          message
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error getting investment suggestions: ${error.message}`
        };
      }
    }
  },
  {
    name: 'recordInvestment',
    description: 'Record an investment in the user history',
    parameters: {
      protocol: 'Protocol name',
      asset: 'Asset name',
      amount: 'Amount invested',
      txHash: 'Transaction hash (optional)'
    },
    validate: (params) => ({
      isValid: !!params.protocol && !!params.asset && !!params.amount,
      error: !params.protocol ? 'Protocol is required' :
             !params.asset ? 'Asset is required' :
             !params.amount ? 'Amount is required' : null
    }),
    handler: async (params, context) => {
      try {
        if (!context.walletAddress) {
          return {
            type: 'ERROR',
            data: { error: 'Wallet address is required' },
            message: 'Wallet address is required to record investment'
          };
        }

        // Record the investment in user history
        userPreferenceStore.addInvestmentToHistory(
          context.walletAddress,
          params.protocol,
          params.asset,
          params.amount,
          params.txHash
        );

        return {
          type: 'INVESTMENT_RECORDED',
          data: { 
            protocol: params.protocol,
            asset: params.asset,
            amount: params.amount
          },
          message: `Successfully recorded your investment of ${params.amount} in ${params.protocol} - ${params.asset}`
        };
      } catch (error: any) {
        return {
          type: 'ERROR',
          data: { error },
          message: `Error recording investment: ${error.message}`
        };
      }
    }
  }
]; 