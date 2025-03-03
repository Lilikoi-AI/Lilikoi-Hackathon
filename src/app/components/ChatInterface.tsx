/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { AbiCoder, ethers } from 'ethers';
import { useEthersSigner } from '@/app/hooks/useEthersSigner';
import { ETH_CONTRACTS, SONIC_CONTRACTS } from '../constants/contract-addresses';
import { BRIDGE_ABI, ERC20_ABI, STATE_ORACLE_ABI, TOKEN_DEPOSIT_ABI, TOKEN_PAIRS_ABI } from '../constants/sonic-abis';

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Network RPC endpoints
const ETHEREUM_RPC = "https://eth-mainnet.g.alchemy.com/v2/RTdxwy09IcN2eTRQHBJw-Ve3_kij5z0O";
const SONIC_RPC = "https://rpc.soniclabs.com";

// Initialize providers
const ethProvider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
const sonicProvider = new ethers.JsonRpcProvider(SONIC_RPC);

export default function ChatInterface() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const signer = useEthersSigner() as ethers.JsonRpcSigner;
  const [answer, setAnswer] = useState<string>('');

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

      if (routerResult.parameters.fromChain === "ETHEREUM" || routerResult.parameters.fromChain === "BASE") {
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

      if(routerResult.parameters.fromChain === "SONIC") {
        try {
          // USDC details
          const USDC_ADDRESS = routerResult.parameters.tokenAddress;
          const amount = ethers.parseUnits(routerResult.parameters.amount, 6); // USDC has 6 decimals

          // 1. Bridge USDC to Ethereum]
          console.log(USDC_ADDRESS, amount);
          setAnswer("Initiating bridge to Ethereum...");
          const withdrawal = await bridgeToEthereum(signer, USDC_ADDRESS, amount);
          console.log(`Withdrawal successful: ${withdrawal.transactionHash}`);

          // 2. Claim USDC on Ethereum
          setAnswer("Waiting for state update and claiming on Ethereum...");
          const claimTx = await claimOnEthereum(signer, withdrawal.transactionHash, withdrawal.blockNumber, withdrawal.withdrawalId);
          console.log(`Claim successful: ${claimTx}`);
          setAnswer(`Claim successful: ${claimTx}`);
        } catch (error: any) {
          console.error("Bridge operation failed:", error?.message);
          throw error;
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

  async function bridgeToSonic (ethSigner: ethers.JsonRpcSigner, tokenAddress: string, amount: bigint) {
    const tokenPairs = new ethers.Contract(ETH_CONTRACTS.TOKEN_PAIRS, TOKEN_PAIRS_ABI, ethProvider);
    const mintedToken = await tokenPairs.originalToMinted(tokenAddress);
    console.log(mintedToken);
    if (mintedToken === ethers.ZeroAddress) {
      throw new Error("Token not supported");
    }

    // 2. Approve token spending
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, ethSigner);
    const approveTx = await token.approve(ETH_CONTRACTS.TOKEN_DEPOSIT, amount);
    await approveTx.wait();

    // 3. Deposit tokens
    const deposit = new ethers.Contract(ETH_CONTRACTS.TOKEN_DEPOSIT, TOKEN_DEPOSIT_ABI, ethSigner);
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

  async function claimOnSonic(sonicSigner: ethers.JsonRpcSigner, depositTxHash: string, depositBlockNumber: bigint, depositId: number) {
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

  async function bridgeToEthereum(sonicSigner: ethers.JsonRpcSigner, tokenAddress: string, amount: bigint) {
    // 1. Check if token is supported
    const tokenPairs = new ethers.Contract(SONIC_CONTRACTS.TOKEN_PAIRS, TOKEN_PAIRS_ABI, sonicProvider);
    const originalToken = await tokenPairs.mintedToOriginal(tokenAddress);
    if (originalToken === ethers.ZeroAddress) {
      throw new Error("Token not supported");
    }

    // 2. Initiate withdrawal
    const bridge = new ethers.Contract(SONIC_CONTRACTS.BRIDGE, BRIDGE_ABI, sonicSigner);
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

  async function claimOnEthereum(ethSigner: ethers.JsonRpcSigner, withdrawalTxHash: string, withdrawalBlockNumber: bigint, withdrawalId: bigint) {
    // 1. Wait for state oracle update
    console.log("Waiting for state oracle update...");
    await waitForEthStateUpdate(withdrawalBlockNumber);

    // 2. Generate proof
    console.log("Generating proof...");
    const proof = await generateWithdrawalProof(withdrawalId);

    // 3. Claim tokens with proof
    const deposit = new ethers.Contract(ETH_CONTRACTS.TOKEN_DEPOSIT, TOKEN_DEPOSIT_ABI, ethSigner);
    const tx = await deposit.claim(withdrawalTxHash, proof);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
                }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg p-3">
              {answer}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about DeFi operations..."
            className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white rounded-lg p-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
