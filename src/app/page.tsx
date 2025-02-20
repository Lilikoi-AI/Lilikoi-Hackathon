'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWalletButton } from './components/WalletConnect';
import ChatInterface from './components/ChatInterface';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Sonic DeFi Agent</h1>
          <p className="text-gray-600">Your AI assistant for DeFi operations on Sonic blockchain</p>
        </header>

        <ConnectWalletButton />

        {isConnected ? (
          <ChatInterface />
        ) : (
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <p className="text-gray-600">Please connect your wallet to chat with the DeFi agent</p>
          </div>
        )}
      </div>
    </div>
  );
}
