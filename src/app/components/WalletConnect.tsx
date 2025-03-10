'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi';

export function ConnectWalletButton() {
  const { open } = useWeb3Modal()
  const { address } = useAccount()

  return (
    <div className="flex items-center justify-center p-4">
      <button
        onClick={() => open()}
        className="px-8 py-3 font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl"
      >
        {address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Connect Wallet'}
      </button>
    </div>
  )
}
