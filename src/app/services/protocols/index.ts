import { ethers } from 'ethers';
import { SONIC_RPC } from '../../constants';

// Protocol information interface
export interface ProtocolInfo {
  name: string;
  displayName: string;
  description: string;
  website: string;
  explorerUrl?: string;
  logoUrl?: string;
  chainId: number;
  tags: string[];
  supports: {
    staking: boolean;
    farming: boolean;
    lending: boolean;
  };
  getVaultAddress?: (asset: string) => Promise<string>;
}

// Static protocol registry for well-known protocols
const protocolsRegistry: Record<string, ProtocolInfo> = {
  aave: {
    name: 'aave',
    displayName: 'Aave',
    description: 'Decentralized lending and borrowing protocol',
    website: 'https://aave.com',
    explorerUrl: 'https://sonicxplorer.sonic.ooo/',
    logoUrl: 'https://aave.com/favicon.ico',
    chainId: 12553,
    tags: ['lending', 'borrowing', 'defi'],
    supports: {
      staking: false,
      farming: false,
      lending: true,
    }
  },
  compound: {
    name: 'compound',
    displayName: 'Compound',
    description: 'Algorithmic money market protocol',
    website: 'https://compound.finance',
    explorerUrl: 'https://sonicxplorer.sonic.ooo/',
    logoUrl: 'https://compound.finance/favicon.ico',
    chainId: 12553,
    tags: ['lending', 'borrowing', 'defi'],
    supports: {
      staking: false,
      farming: false,
      lending: true,
    }
  },
  // Add more static protocols here...
};

// Dynamic protocol registry for protocols from DeFiLlama
const dynamicProtocolsRegistry: Record<string, ProtocolInfo> = {};

export class ProtocolsService {
  private static provider = new ethers.JsonRpcProvider(SONIC_RPC);

  /**
   * Get information about a specific protocol
   */
  static getProtocolInfo(protocol: string): ProtocolInfo | null {
    const normalizedProtocol = protocol.toLowerCase();
    return protocolsRegistry[normalizedProtocol] || dynamicProtocolsRegistry[normalizedProtocol] || null;
  }
  
  /**
   * Get a list of all supported protocols
   */
  static getSupportedProtocols(): ProtocolInfo[] {
    return [
      ...Object.values(protocolsRegistry),
      ...Object.values(dynamicProtocolsRegistry)
    ];
  }
  
  /**
   * Check if a protocol is supported
   */
  static isProtocolSupported(protocol: string): boolean {
    const normalizedProtocol = protocol.toLowerCase();
    return normalizedProtocol in protocolsRegistry || normalizedProtocol in dynamicProtocolsRegistry;
  }
  
  /**
   * Get vault address for a specific protocol and asset
   */
  static async getVaultAddress(protocol: string, asset: string): Promise<string> {
    const protocolInfo = this.getProtocolInfo(protocol);
    
    if (!protocolInfo) {
      throw new Error(`Protocol ${protocol} not supported`);
    }
    
    if (protocolInfo.getVaultAddress) {
      return protocolInfo.getVaultAddress(asset);
    }
    
    // If no specific vault address getter, fall back to a generic address lookup
    return this.getGenericVaultAddress(protocol, asset);
  }

  // Generic vault address lookup
  private static async getGenericVaultAddress(protocol: string, asset: string): Promise<string> {
    // For dynamically registered protocols, we'll use the protocol adapter's contractAddress
    const { YieldService } = await import('../yield');
    const adapter = YieldService.getProtocolAdapter(protocol);
    
    if (adapter && adapter.contractAddress) {
      return adapter.contractAddress;
    }
    
    throw new Error(`No vault address found for ${protocol} and asset ${asset}`);
  }

  /**
   * Register a new protocol dynamically
   * This allows supporting any protocol returned by DeFiLlama without hardcoding
   */
  static registerProtocol(
    protocol: string,
    protocolInfo: Partial<ProtocolInfo>
  ): ProtocolInfo {
    const normalizedProtocol = protocol.toLowerCase();
    
    // Check if protocol already exists in static registry
    if (normalizedProtocol in protocolsRegistry) {
      console.log(`Protocol ${protocol} is already registered in static registry`);
      return protocolsRegistry[normalizedProtocol];
    }
    
    // If exists in dynamic registry, update it
    if (normalizedProtocol in dynamicProtocolsRegistry) {
      dynamicProtocolsRegistry[normalizedProtocol] = {
        ...dynamicProtocolsRegistry[normalizedProtocol],
        ...protocolInfo
      };
      console.log(`Updated protocol ${protocol} in dynamic registry`);
      return dynamicProtocolsRegistry[normalizedProtocol];
    }
    
    // Create new protocol entry
    const newProtocolInfo: ProtocolInfo = {
      name: normalizedProtocol,
      displayName: protocolInfo.displayName || protocol,
      description: protocolInfo.description || `${protocol} DeFi protocol`,
      website: protocolInfo.website || '',
      explorerUrl: protocolInfo.explorerUrl || '',
      logoUrl: protocolInfo.logoUrl || '',
      chainId: protocolInfo.chainId || 12553, // Default to Sonic Chain ID
      tags: protocolInfo.tags || ['defi'],
      supports: protocolInfo.supports || {
        staking: true,
        farming: true,
        lending: false,
      },
      getVaultAddress: protocolInfo.getVaultAddress
    };
    
    // Add to dynamic registry
    dynamicProtocolsRegistry[normalizedProtocol] = newProtocolInfo;
    console.log(`Registered new protocol ${protocol} in dynamic registry`);
    
    return newProtocolInfo;
  }

  /**
   * Bulk register protocols from DeFiLlama data
   * This allows quickly supporting all protocols returned from the API
   */
  static registerProtocolsFromDefiLlama(protocols: Array<{
    name: string;
    displayName?: string;
    url?: string;
    description?: string;
    tvlUsd?: number;
    chainIds?: number[];
  }>): void {
    protocols.forEach(protocol => {
      if (!protocol.name) return;
      
      this.registerProtocol(protocol.name, {
        displayName: protocol.displayName || protocol.name,
        description: protocol.description || `${protocol.name} DeFi protocol`,
        website: protocol.url || '',
        chainId: protocol.chainIds?.[0] || 12553,
        tags: ['defi', 'yield'],
        supports: {
          staking: true,
          farming: true,
          lending: false,
        }
      });
    });
    
    console.log(`Registered ${protocols.length} protocols from DeFiLlama`);
  }
} 