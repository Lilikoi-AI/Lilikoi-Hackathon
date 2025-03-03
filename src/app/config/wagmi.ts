import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage } from 'wagmi'
import { mainnet, sonic, sonicBlazeTestnet, base } from 'viem/chains'

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

const metadata = {
  name: 'Sonic DeFi Agent',
  description: 'AI-powered DeFi agent for Sonic blockchain',
  url: 'https://sonic.ai',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

export const config = defaultWagmiConfig({
  chains: [mainnet, sonic, sonicBlazeTestnet, base],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  metadata: metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage
  })
})
