import { dlnSourceAbi } from "@/app/contracts/DInSource.abi";
import { dlnDestinationAbi } from "@/app/contracts/DInDestination.abi";
import { Contract, ethers } from "ethers";

const dInSourceAddress = "0xeF4fB24aD0916217251F553c0596F8Edc630EB66";
const dInDestinationAddress = "0xe7351fd770a37282b91d153ee690b63579d6dd7f";

export const dlnSourceContract = new Contract(dInSourceAddress, dlnSourceAbi);
export const dlnDestinationContract = new Contract(dInDestinationAddress, dlnDestinationAbi);

/**
 * Creates a transaction object for cross-chain token exchange
 * @param srcToken Source token address
 * @param dstToken Destination token address
 * @param srcAmount Amount to send (in smallest unit)
 * @param dstAmount Amount to receive (in smallest unit)
 * @param dstChainId Destination chain ID
 * @param receiver Receiver address on destination chain
 * @returns Transaction object ready for signing
 */
export function createOrderTx(
  srcToken: string,
  dstToken: string,
  srcAmount: string,
  dstAmount: string,
  dstChainId: number,
  receiver: string
) {
  // Create order parameters based on the actual contract methods
  const orderParams = {
    giveTokenAddress: srcToken,
    giveAmount: srcAmount,
    takeTokenAddress: ethers.toUtf8Bytes(dstToken), // Convert to bytes format
    takeAmount: dstAmount,
    takeChainId: dstChainId,
    receiverDst: ethers.toUtf8Bytes(receiver), // Convert to bytes format
    givePatchAuthoritySrc: ethers.ZeroAddress,
    orderAuthorityAddressDst: ethers.toUtf8Bytes(ethers.ZeroAddress),
    allowedTakerDst: ethers.toUtf8Bytes(ethers.ZeroAddress),
    externalCall: "0x"
  };
  
  // Create transaction object
  return {
    to: dInSourceAddress,
    data: dlnSourceContract.interface.encodeFunctionData("createOrder", [orderParams]),
    value: srcToken === ethers.ZeroAddress ? srcAmount : "0"
  };
}

/**
 * Creates a transaction object for token approval
 * @param tokenAddress The token address to approve
 * @param amount The amount to approve
 * @returns Transaction object ready for signing
 */
export function createApprovalTx(
  tokenAddress: string,
  amount: string
) {
  const erc20Interface = new ethers.Interface([
    "function approve(address spender, uint256 amount) returns (bool)"
  ]);
  
  return {
    to: tokenAddress,
    data: erc20Interface.encodeFunctionData("approve", [dInSourceAddress, amount]),
    value: "0"
  };
}

/**
 * Creates a transaction object for filling an existing cross-chain order
 * @param orderId The ID of the order to fill
 * @param makerAddress The address of the order creator
 * @param srcChainId Source chain ID
 * @returns Transaction object ready for signing
 */
export function fillOrderTx(
  orderId: string,
  makerAddress: string,
  srcChainId: number
) {
  // Fill order parameters
  const fillParams = {
    makerOrderNonce: orderId,
    makerSrc: ethers.toUtf8Bytes(makerAddress),
    giveChainId: srcChainId,
    // Add other required parameters based on the actual contract
  };
  
  // Create transaction object
  return {
    to: dInDestinationAddress,
    data: dlnDestinationContract.interface.encodeFunctionData("fillOrder", [fillParams]),
    value: "0"
  };
}

/**
 * Creates a transaction object for cancelling an existing order
 * @param orderId The ID of the order to cancel
 * @returns Transaction object ready for signing
 */
export function cancelOrderTx(orderId: string) {
  return {
    to: dInSourceAddress,
    data: dlnSourceContract.interface.encodeFunctionData("cancelOrder", [orderId]),
    value: "0"
  };
}

/**
 * Creates a transaction object for bridging tokens
 * @param fromChain Source chain ID
 * @param toChain Destination chain ID
 * @param fromToken Source token address
 * @param toToken Destination token address
 * @param amount Amount to bridge (in smallest unit)
 * @param recipient Recipient address on destination chain
 * @returns Transaction object ready for signing
 */
export function bridgeTokensTx(
  fromChain: number,
  toChain: number,
  fromToken: string,
  toToken: string,
  amount: string,
  recipient: string
) {
  // Prepare bridge parameters
  const nonce = Date.now(); // Unique identifier for the transaction
  
  // Create transaction object
  return {
    to: dInSourceAddress,
    data: dlnSourceContract.interface.encodeFunctionData("bridgeTokens", [
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      recipient,
      nonce
    ]),
    value: fromToken === ethers.ZeroAddress ? amount : "0"
  };
}

/**
 * Creates a transaction object for claiming bridged tokens
 * @param txHash The transaction hash of the bridge operation
 * @param proof The proof required for claiming
 * @returns Transaction object ready for signing
 */
export function claimBridgedTokensTx(txHash: string, proof: string) {
  return {
    to: dInDestinationAddress,
    data: dlnDestinationContract.interface.encodeFunctionData("claim", [txHash, proof]),
    value: "0"
  };
}

/**
 * Gets the status of an order
 * @param provider The provider for querying
 * @param orderId The ID of the order
 */
export async function getOrderStatus(
  provider: ethers.Provider,
  orderId: string
) {
  try {
    // Get order details
    const order = await dlnSourceContract.getOrder(orderId);
    
    return {
      orderId,
      status: order.status,
      giveToken: order.giveTokenAddress,
      giveAmount: order.giveAmount.toString(),
      takeToken: ethers.toUtf8String(order.takeTokenAddress),
      takeAmount: order.takeAmount.toString(),
      filled: order.filled
    };
  } catch (error) {
    console.error('Get order status error:', error);
    throw error;
  }
}

/**
 * Gets the estimated fee for bridging tokens
 * @param provider The provider for the source chain
 * @param fromChain Source chain ID
 * @param toChain Destination chain ID
 * @param fromToken Source token address
 * @param amount Amount to bridge
 */
export async function getBridgeFee(
  provider: ethers.Provider,
  fromChain: number,
  toChain: number,
  fromToken: string,
  amount: string
) {
  try {
    // Get fee estimation
    const fee = await dlnSourceContract.estimateFee(
      fromChain,
      toChain,
      fromToken,
      amount
    );
    
    return {
      baseFee: fee.baseFee.toString(),
      protocolFee: fee.protocolFee.toString(),
      totalFee: fee.totalFee.toString()
    };
  } catch (error) {
    console.error('Fee estimation error:', error);
    throw error;
  }
}

/**
 * Checks the status of a bridge transaction
 * @param provider The provider for the destination chain
 * @param txHash The transaction hash of the bridge operation
 */
export async function checkBridgeStatus(
  provider: ethers.Provider,
  txHash: string
) {
  try {
    // Get transaction status
    const status = await dlnDestinationContract.getTransactionStatus(txHash);
    
    return {
      status: status.status,
      completedAt: status.completedAt ? new Date(status.completedAt * 1000) : null,
      isCompleted: status.isCompleted
    };
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
}
