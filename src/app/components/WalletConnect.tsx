'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react'

export function ConnectWalletButton() {
  const { open } = useWeb3Modal()

  return (
    <div className="flex items-center justify-center p-4">
      <button
        onClick={() => open()}
        className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Connect Wallet
      </button>
    </div>
  )
}
