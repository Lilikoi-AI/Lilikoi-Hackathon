'use client';

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { useDebridge } from '../hooks/useDebridge'
import { DEBRIDGE_CONFIG } from '../config/debridge'
import { ethers } from 'ethers'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatInterface() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { 
    bridgeTokens, 
    sendCrossChainMessage, 
    isLoading: isBridging, 
    error: bridgeError 
  } = useDebridge()

  const handleBridgeResponse = async (response: any) => {
    if (response.error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${response.error}`
      }]);
      return;
    }

    if (response.action === 'bridgeTokens') {
      try {
        const tx = await bridgeTokens({
          fromChainId: DEBRIDGE_CONFIG.CHAINS[response.parameters.fromChain],
          toChainId: DEBRIDGE_CONFIG.CHAINS[response.parameters.toChain],
          tokenAddress: response.parameters.tokenAddress,
          amount: response.parameters.amount,
          receiverAddress: address
        });
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Bridge transaction initiated! Transaction hash: ${tx.hash}`
        }]);
      } catch (error) {
        console.error('Bridge error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Failed to initiate bridge: ${error.message}`
        }]);
      }
    } else if (response.action === 'crossChainMessage') {
      try {
        const tx = await sendCrossChainMessage(
          DEBRIDGE_CONFIG.CHAINS[response.parameters.fromChain],
          DEBRIDGE_CONFIG.CHAINS[response.parameters.toChain],
          response.parameters.message,
          response.parameters.receiverAddress
        );
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Message sent! Transaction hash: ${tx.hash}`
        }]);
      } catch (error) {
        console.error('Message error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Failed to send message: ${error.message}`
        }]);
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chainId = await publicClient.getChainId();
      
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

      if (routerResult.error) {
        throw new Error(routerResult.error);
      }

      // Handle bridge actions
      if (routerResult.action === 'bridgeTokens' || 
          routerResult.action === 'crossChainMessage') {
        await handleBridgeResponse(routerResult);
      } else {
        // Regular chat flow
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            walletAddress: address
          })
        });

        if (!response.ok) {
          throw new Error('Chat request failed');
        }

        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process request'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrossChainMessage = async (message: string, targetChain: number) => {
    try {
      const tx = await sendCrossChainMessage(
        DEBRIDGE_CONFIG.CHAINS.ETHEREUM, // From Ethereum
        targetChain, // To target chain
        message,
        '0x123....' // Receiver contract address
      )
      console.log('Cross-chain message sent:', tx.hash)
    } catch (error) {
      console.error('Failed to send cross-chain message:', error)
    }
  }

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
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
              Thinking...
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
