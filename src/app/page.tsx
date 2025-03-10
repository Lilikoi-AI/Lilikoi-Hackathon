'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWalletButton } from './components/WalletConnect';
import ChatInterface from './components/ChatInterface';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Top Navigation Bar */}
      <div className="w-full border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button className="px-4 py-2 text-purple-100 border border-purple-500/20 rounded-lg hover:bg-purple-500/10 transition-all flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            New Chat
          </button>
          <ConnectWalletButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500">
            Lilikoi - Your DeFi Brain
          </h1>
        </div>

        {isConnected ? (
          <>
            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* Staking Agent Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all cursor-pointer">
                <h3 className="text-xl font-semibold text-purple-100 mb-2">Staking Agent</h3>
                <p className="text-purple-200/60">Manage your token staking and rewards</p>
              </div>

              {/* Bridging Agent Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all cursor-pointer">
                <h3 className="text-xl font-semibold text-purple-100 mb-2">Bridging Agent</h3>
                <p className="text-purple-200/60">Bridge tokens between chains</p>
              </div>

              {/* LP Balancer Agent Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all cursor-pointer">
                <h3 className="text-xl font-semibold text-purple-100 mb-2">LP Balancer Agent</h3>
                <p className="text-purple-200/60">Optimize your liquidity positions</p>
              </div>
            </div>

            {/* Chat Interface */}
            <ChatInterface />
          </>
        ) : (
          <div className="text-center p-8 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20 shadow-2xl">
            <p className="text-purple-200">Please connect your wallet to chat with the DeFi agent</p>
          </div>
        )}
      </div>
    </div>
  );
}
