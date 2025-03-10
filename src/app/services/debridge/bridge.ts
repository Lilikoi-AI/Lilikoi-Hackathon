import { DeBridgeCore } from './core';
import { ethers } from 'ethers';
import { dlnSourceAbi } from '../../contracts/DInSource.abi';
import { getTokenAddress, getTokenDecimals, getDebridgeChainId, DEBRIDGE_CHAIN_IDS } from '../actions/debridge-token';

export interface BridgeParams {
  sourceChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  receiver: string;
  tokenAddress?: string; // Optional token address if already fetched
}

export class DeBridgeBridge extends DeBridgeCore {
  /**
   * Bridge tokens from one chain to another using deBridge
   * @param params Bridge parameters
   * @returns Transaction hash
   */
  async bridgeToken(params: BridgeParams): Promise<string> {
    // Get current chain ID
    const currentChainId = await this.getChainId();
    
    // Normalize chain names for consistency
    const normalizedSourceChain = params.sourceChain.toUpperCase();
    const normalizedDestinationChain = params.destinationChain.toUpperCase();
    
    console.log(`Attempting to bridge from ${normalizedSourceChain} to ${normalizedDestinationChain}`);
    console.log(`Current chain ID: ${currentChainId}`);
    console.log(`Available chains: ${Object.keys(DEBRIDGE_CHAIN_IDS).join(', ')}`);
    
    // Get chain IDs
    const sourceChainId = await getDebridgeChainId(normalizedSourceChain);
    const destinationChainId = await getDebridgeChainId(normalizedDestinationChain);
    
    console.log(`Source chain ID: ${sourceChainId}, Destination chain ID: ${destinationChainId}`);
    
    if (!sourceChainId) {
      const supportedChains = Object.keys(DEBRIDGE_CHAIN_IDS).join(', ');
      throw new Error(`Unsupported source chain: ${normalizedSourceChain}. Supported chains: ${supportedChains}`);
    }
    
    if (!destinationChainId) {
      const supportedChains = Object.keys(DEBRIDGE_CHAIN_IDS).join(', ');
      throw new Error(`Unsupported destination chain: ${normalizedDestinationChain}. Supported chains: ${supportedChains}`);
    }
    
    // Check minimum amount requirements
    const amountNum = parseFloat(params.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error(`Invalid amount: ${params.amount}. Please provide a positive number.`);
    }
    
    // Check if the amount meets minimum requirements for this specific route
    const minAmount = this.getMinimumAmount(normalizedSourceChain, normalizedDestinationChain, params.tokenSymbol);
    if (amountNum < minAmount) {
      throw new Error(`Amount too low. For bridging ${params.tokenSymbol} from ${normalizedSourceChain} to ${normalizedDestinationChain}, the minimum amount is ${minAmount} ${params.tokenSymbol} to cover transaction fees.`);
    }
    
    // Special handling for Sonic chain
    let currentChainIdStr = String(currentChainId);
    if (normalizedSourceChain === 'SONIC' && currentChainId === 146) {
      // If we're on Sonic chain with ID 146, convert to deBridge format
      currentChainIdStr = '100000014';
      console.log(`Converting Sonic chain ID from 146 to deBridge format: ${currentChainIdStr}`);
    }
    
    // Validate that current chain matches source chain
    if (currentChainIdStr !== sourceChainId) {
      console.error(`Chain ID mismatch: Current chain ID is ${currentChainIdStr}, but source chain ID is ${sourceChainId}`);
      throw new Error(`Current chain (${currentChainId}) does not match source chain (${sourceChainId}). Please switch networks.`);
    }
    
    // Use the deBridge chain ID directly
    const debridgeSourceChainId = sourceChainId;
    const debridgeDestinationChainId = destinationChainId;
    
    console.log(`Using deBridge source chain ID: ${debridgeSourceChainId}`);
    console.log(`Using deBridge destination chain ID: ${debridgeDestinationChainId}`);
    
    // Get token address on source chain - either use provided address or fetch it
    let tokenAddress = params.tokenAddress || '';
    
    if (!tokenAddress) {
      console.log(`Fetching token address for ${params.tokenSymbol} on chain ${debridgeSourceChainId}`);
      const fetchedAddress = await getTokenAddress(debridgeSourceChainId, params.tokenSymbol);
      
      if (!fetchedAddress) {
        throw new Error(`Token ${params.tokenSymbol} not found on ${params.sourceChain}`);
      }
      
      tokenAddress = fetchedAddress;
      console.log(`Using token address: ${tokenAddress} for ${params.tokenSymbol}`);
    }
    
    // Get token decimals
    let decimals = 18; // Default to 18 decimals
    try {
      const fetchedDecimals = await getTokenDecimals(debridgeSourceChainId, params.tokenSymbol);
      if (fetchedDecimals !== null) {
        decimals = fetchedDecimals;
        console.log(`Using ${decimals} decimals for ${params.tokenSymbol}`);
      }
    } catch (error) {
      console.warn(`Could not fetch decimals for ${params.tokenSymbol}, using default of 18`);
    }
    
    // Get contracts
    const contracts = this.getContracts();
    
    // Check if native token (ETH, S, etc.)
    const isNativeToken = tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    // Parse amount with correct decimals
    const amountWei = ethers.parseUnits(params.amount, decimals);
    console.log(`Parsed amount: ${params.amount} ${params.tokenSymbol} = ${amountWei.toString()} wei`);
    
    try {
      // Get the deBridge gate contract
      const deBridgeGateAddress = contracts.DEBRIDGE_GATE;
      const deBridgeGateAbi = dlnSourceAbi; // Use the DLN source ABI for the deBridge gate
      
      // Create contract instance
      const provider = await this.getProvider();
      const signer = await this.getSigner();
      
      // Log signer details
      console.log(`Using signer with address: ${await signer.getAddress()}`);
      
      const deBridgeGate = new ethers.Contract(deBridgeGateAddress, deBridgeGateAbi, signer);
      
      console.log('Bridge parameters:', {
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        tokenSymbol: params.tokenSymbol,
        amount: params.amount,
        amountWei: amountWei.toString(),
        decimals,
        receiver: params.receiver,
        tokenAddress: tokenAddress,
        isNativeToken,
        deBridgeGateAddress
      });
      
      // For native tokens (ETH, S), we need to send value with the transaction
      const txOptions: any = {
        gasLimit: 10000000 // Increased gas limit from 8,000,000 to 10,000,000
      };
      
      console.log(`Setting gas limit to 10,000,000 for bridging transaction`);
      
      if (isNativeToken) {
        txOptions.value = amountWei;
        console.log(`Using native token with value: ${amountWei.toString()}`);
      } else {
        // For ERC20 tokens, we need to approve the deBridge gate contract first
        const erc20Abi = [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function allowance(address owner, address spender) public view returns (uint256)",
          "function balanceOf(address owner) public view returns (uint256)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        
        // Check token balance
        const userAddress = await signer.getAddress();
        const balance = await tokenContract.balanceOf(userAddress);
        console.log(`Token balance: ${ethers.formatUnits(balance, decimals)} ${params.tokenSymbol}`);
        
        if (balance < amountWei) {
          throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} ${params.tokenSymbol}, but you're trying to bridge ${params.amount} ${params.tokenSymbol}.`);
        }
        
        // Check current allowance
        const currentAllowance = await tokenContract.allowance(userAddress, deBridgeGateAddress);
        console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, decimals)} ${params.tokenSymbol}`);
        
        if (currentAllowance < amountWei) {
          console.log(`Approving ${params.amount} ${params.tokenSymbol} for deBridge gate...`);
          
          try {
            // This will trigger the first signing message for token approval
            const approveTx = await tokenContract.approve(deBridgeGateAddress, amountWei);
            console.log(`Approval transaction submitted: ${approveTx.hash}`);
            
            // Wait for approval transaction to be mined
            console.log(`Waiting for approval transaction to be mined...`);
            const approveReceipt = await approveTx.wait();
            console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);
          } catch (approveError: any) {
            console.error('Token approval error:', approveError);
            if (approveError.code === 'ACTION_REJECTED' || approveError.code === 4001) {
              throw new Error('Transaction was rejected by the user. Bridging cancelled.');
            } else {
              throw new Error(`Failed to approve token: ${approveError.message || 'Unknown error'}`);
            }
          }
        } else {
          console.log(`Allowance already sufficient: ${ethers.formatUnits(currentAllowance, decimals)} ${params.tokenSymbol}`);
        }
      }
      
      // Prepare destination chain ID in the format expected by deBridge
      const destChainIdBigInt = BigInt(debridgeDestinationChainId);
      
      // Prepare receiver address in the correct format
      const receiverAddress = params.receiver as `0x${string}`;
      
      // This will trigger the second signing message for the actual bridge transaction
      console.log(`Initiating bridge transaction...`);
      
      try {
        // Prepare parameters for the send function
        // function send(
        //   address _tokenAddress,
        //   uint256 _amount,
        //   uint256 _chainIdTo,
        //   bytes memory _receiver,
        //   bytes memory _permitEnvelope,
        //   bool _useAssetFee,
        //   uint32 _referralCode,
        //   bytes calldata _autoParams
        // )
        
        // Convert receiver address to bytes format
        // Make sure the receiver address is properly formatted
        let receiverBytes;
        try {
          // Ensure the receiver address is a valid Ethereum address
          const formattedAddress = ethers.getAddress(receiverAddress);
          console.log(`Formatted receiver address: ${formattedAddress}`);
          
          // Convert to bytes - use proper encoding for Ethereum addresses
          receiverBytes = ethers.zeroPadValue(ethers.hexlify(ethers.getBytes(formattedAddress)), 32);
          console.log(`Encoded receiver bytes: ${receiverBytes}`);
        } catch (error) {
          console.error('Error formatting receiver address:', error);
          throw new Error(`Invalid receiver address format: ${receiverAddress}. Please provide a valid Ethereum address.`);
        }
        
        // Empty permit envelope
        const permitEnvelope = "0x";
        
        // Don't use asset fee
        const useAssetFee = false;
        
        // Referral code (0 for now)
        const referralCode = 0;
        
        // Empty auto params
        const autoParams = "0x";
        
        console.log(`Sending transaction with parameters:`, {
          tokenAddress,
          amount: amountWei.toString(),
          destinationChainId: destChainIdBigInt.toString(),
          receiver: receiverAddress,
          receiverBytes,
          permitEnvelope,
          useAssetFee,
          referralCode,
          autoParams,
          gasLimit: txOptions.gasLimit,
          value: txOptions.value || '0'
        });
        
        // For native tokens, ensure the value is set correctly
        if (isNativeToken) {
          console.log(`Using native token with value: ${amountWei.toString()}`);
          txOptions.value = amountWei;
        }
        
        // Call the send function with the correct parameters
        const tx = await deBridgeGate.send(
          tokenAddress,
          amountWei.toString(),
          destChainIdBigInt,
          receiverBytes,
          permitEnvelope,
          useAssetFee,
          referralCode,
          autoParams,
          txOptions
        );
        
        console.log(`Bridge transaction submitted: ${tx.hash}`);
        console.log(`Transaction details:`, {
          hash: tx.hash,
          from: await signer.getAddress(),
          to: deBridgeGateAddress,
          value: txOptions.value || '0',
          gasLimit: txOptions.gasLimit
        });
        
        // Wait for transaction to be mined
        console.log(`Waiting for bridge transaction to be mined...`);
        const receipt = await tx.wait();
        if (receipt) {
          console.log(`Bridge transaction confirmed in block ${receipt.blockNumber}: ${receipt.hash}`);
          return receipt.hash;
        } else {
          console.log(`Transaction was submitted but receipt is null`);
          return tx.hash; // Return the transaction hash if receipt is null
        }
      } catch (bridgeError: any) {
        console.error('Bridge transaction error:', bridgeError);
        
        // Check for UNPREDICTABLE_GAS_LIMIT error
        if (bridgeError.code === 'UNPREDICTABLE_GAS_LIMIT') {
          console.error('Gas estimation failed. Using manual gas limit...');
          
          try {
            // Try using a different approach with contract interface and manual gas limit
            const deBridgeGateInterface = new ethers.Interface([
              "function send(address _tokenAddress, uint256 _amount, uint256 _chainIdTo, bytes memory _receiver, bytes memory _permitEnvelope, bool _useAssetFee, uint32 _referralCode, bytes calldata _autoParams) external payable returns (bytes32)"
            ]);
            
            // Convert receiver address to bytes format - use proper encoding
            const formattedAddress = ethers.getAddress(receiverAddress);
            const receiverBytes = ethers.zeroPadValue(ethers.hexlify(ethers.getBytes(formattedAddress)), 32);
            
            // Encode function data
            const data = deBridgeGateInterface.encodeFunctionData("send", [
              tokenAddress,
              amountWei.toString(),
              destChainIdBigInt,
              receiverBytes,
              "0x", // permitEnvelope
              false, // useAssetFee
              0, // referralCode
              "0x" // autoParams
            ]);
            
            // Create transaction request with higher gas limit
            const txRequest = {
              to: deBridgeGateAddress,
              data: data,
              gasLimit: 10000000, // Increased gas limit
              ...(isNativeToken ? { value: amountWei } : {}) // Ensure value is set for native tokens
            };
            
            console.log('Sending transaction with manual gas limit:', txRequest);
            
            // Send the transaction
            const manualTx = await signer.sendTransaction(txRequest);
            console.log(`Bridge transaction submitted with manual gas limit: ${manualTx.hash}`);
            
            // Wait for transaction to be mined
            console.log(`Waiting for bridge transaction to be mined...`);
            const manualReceipt = await manualTx.wait();
            if (manualReceipt) {
              console.log(`Bridge transaction confirmed in block ${manualReceipt.blockNumber}: ${manualReceipt.hash}`);
              return manualReceipt.hash;
            } else {
              console.log(`Transaction was submitted but receipt is null`);
              return manualTx.hash;
            }
          } catch (manualError: any) {
            console.error('Manual gas limit transaction error:', manualError);
            
            // Check if the error contains detailed information about the revert
            if (manualError.data) {
              console.error('Transaction revert data:', manualError.data);
            }
            
            if (manualError.code === 'ACTION_REJECTED' || manualError.code === 4001) {
              throw new Error('Transaction was rejected by the user. Bridging cancelled.');
            } else if (manualError.message && manualError.message.includes('extra fees')) {
              throw new Error(`Transaction would cost more in fees than the value being transferred. Please try with a larger amount (at least 5 ${params.tokenSymbol} for bridging to Ethereum).`);
            } else {
              throw new Error(`Failed to bridge token with manual gas limit: ${manualError.message || 'Unknown error'}`);
            }
          }
        }
        
        // Check if the error is related to the function signature
        if (bridgeError.message && bridgeError.message.includes('is not a function')) {
          console.error('Function signature error. Trying alternative approach...');
          
          try {
            // Try using a different approach with contract interface
            const deBridgeGateInterface = new ethers.Interface([
              "function send(address _tokenAddress, uint256 _amount, uint256 _chainIdTo, bytes memory _receiver, bytes memory _permitEnvelope, bool _useAssetFee, uint32 _referralCode, bytes calldata _autoParams) external payable returns (bytes32)"
            ]);
            
            // Convert receiver address to bytes format - use proper encoding
            const formattedAddress = ethers.getAddress(receiverAddress);
            const receiverBytes = ethers.zeroPadValue(ethers.hexlify(ethers.getBytes(formattedAddress)), 32);
            
            // Encode function data
            const data = deBridgeGateInterface.encodeFunctionData("send", [
              tokenAddress,
              amountWei.toString(),
              destChainIdBigInt,
              receiverBytes,
              "0x", // permitEnvelope
              false, // useAssetFee
              0, // referralCode
              "0x" // autoParams
            ]);
            
            // Create transaction request
            const txRequest = {
              to: deBridgeGateAddress,
              data: data,
              gasLimit: 10000000, // Increased gas limit
              ...(isNativeToken ? { value: amountWei } : {}) // Ensure value is set for native tokens
            };
            
            console.log('Sending transaction with request:', txRequest);
            
            // Send the transaction
            const altTx = await signer.sendTransaction(txRequest);
            console.log(`Bridge transaction submitted with alternative method: ${altTx.hash}`);
            
            // Wait for transaction to be mined
            console.log(`Waiting for bridge transaction to be mined...`);
            const altReceipt = await altTx.wait();
            if (altReceipt) {
              console.log(`Bridge transaction confirmed in block ${altReceipt.blockNumber}: ${altReceipt.hash}`);
              return altReceipt.hash;
            } else {
              console.log(`Transaction was submitted but receipt is null`);
              return altTx.hash;
            }
          } catch (altError: any) {
            console.error('Alternative transaction error:', altError);
            
            // Check if the error contains detailed information about the revert
            if (altError.data) {
              console.error('Transaction revert data:', altError.data);
            }
            
            if (altError.code === 'ACTION_REJECTED' || altError.code === 4001) {
              throw new Error('Transaction was rejected by the user. Bridging cancelled.');
            } else if (altError.message && altError.message.includes('extra fees')) {
              throw new Error(`Transaction would cost more in fees than the value being transferred. Please try with a larger amount (at least 5 ${params.tokenSymbol} for bridging to Ethereum).`);
            } else {
              throw new Error(`Failed to bridge token with alternative method: ${altError.message || 'Unknown error'}`);
            }
          }
        }
        
        // For other errors, provide a generic message
        if (bridgeError.code === 'ACTION_REJECTED' || bridgeError.code === 4001) {
          throw new Error('Transaction was rejected by the user. Bridging cancelled.');
        } else if (bridgeError.message && bridgeError.message.includes('extra fees')) {
          throw new Error(`Transaction would cost more in fees than the value being transferred. Please try with a larger amount (at least 5 ${params.tokenSymbol} for bridging to Ethereum).`);
        } else {
          throw new Error(`Failed to bridge token: ${bridgeError.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error('Bridge error:', error);
      throw error;
    }
  }
  
  /**
   * Encode the bridge function call
   * @param tokenAddress Token address
   * @param amount Amount in wei
   * @param destinationChainId Destination chain ID
   * @param receiver Receiver address
   * @returns Encoded function call
   */
  private encodeBridgeFunction(
    tokenAddress: `0x${string}`,
    amount: string,
    destinationChainId: bigint,
    receiver: `0x${string}`
  ): `0x${string}` {
    // This is a simplified version, in a real implementation you would use ethers.js or viem to encode the function call
    // For example with ethers.js:
    // const iface = new ethers.utils.Interface(dlnSourceAbi);
    // return iface.encodeFunctionData('send', [tokenAddress, amount, destinationChainId, receiver, '0x']);
    
    // For now, returning a placeholder
    return '0x' as `0x${string}`;
  }

  /**
   * Get the minimum amount required for bridging based on the source and destination chains and token
   * @param sourceChain Source chain name
   * @param destinationChain Destination chain name
   * @param tokenSymbol Token symbol
   * @returns Minimum amount required
   */
  private getMinimumAmount(sourceChain: string, destinationChain: string, tokenSymbol: string): number {
    // Default minimum amounts for different tokens
    const defaultMinimums: Record<string, number> = {
      'USDC': 0.1,  // Default minimum for USDC
      'USDT': 0.1,  // Default minimum for USDT
      'ETH': 0.0001, // Default minimum for ETH
      'S': 0.01,    // Default minimum for S (Sonic token)
    };
    
    // Specific route minimums - these are higher due to gas costs on certain chains
    const routeMinimums: Record<string, Record<string, Record<string, number>>> = {
      'SONIC': {
        'ETHEREUM': {
          'USDC': 5.0, // Minimum 5 USDC for Sonic -> Ethereum due to high Ethereum gas fees
          'USDT': 5.0, // Minimum 5 USDT for Sonic -> Ethereum
          'ETH': 0.001 // Minimum 0.001 ETH for Sonic -> Ethereum
        },
        'ARBITRUM': {
          'USDC': 1.0, // Lower minimum for L2s
        },
        'OPTIMISM': {
          'USDC': 1.0, // Lower minimum for L2s
        },
        'BASE': {
          'USDC': 1.0, // Lower minimum for L2s
        }
      },
      'ETHEREUM': {
        'SONIC': {
          'USDC': 1.0, // Lower minimum for Ethereum -> Sonic
          'USDT': 1.0,
          'ETH': 0.0001
        }
      }
    };
    
    // Check if there's a specific minimum for this route and token
    const sourceRoutes = routeMinimums[sourceChain];
    if (sourceRoutes) {
      const destRoutes = sourceRoutes[destinationChain];
      if (destRoutes) {
        const tokenMin = destRoutes[tokenSymbol];
        if (tokenMin !== undefined) {
          console.log(`Using route-specific minimum amount for ${sourceChain} -> ${destinationChain} ${tokenSymbol}: ${tokenMin}`);
          return tokenMin;
        }
      }
    }
    
    // Fall back to default minimum for the token
    const defaultMin = defaultMinimums[tokenSymbol] || 0.1;
    console.log(`Using default minimum amount for ${tokenSymbol}: ${defaultMin}`);
    return defaultMin;
  }
} 