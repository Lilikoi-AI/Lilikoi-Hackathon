# Lilikoi - AI-Powered DeFi Assistant

Lilikoi is an advanced AI-powered DeFi assistant that helps users interact with various blockchain functionalities through natural language conversations. Built with Next.js and integrated with multiple blockchain networks, Lilikoi makes DeFi operations accessible and user-friendly.

🌐 **Live Demo**: [https://lilikoi-livid.vercel.app](https://lilikoi-livid.vercel.app)

## Features

### 🔄 Cross-Chain Operations

- Bridge tokens between different blockchain networks
- Track cross-chain transactions
- View bridged token balances

### 💰 Token Management

- Check token balances across chains
- View token prices and history
- Set price alerts
- Get token addresses

### 🏊‍♂️ DeFi Operations

- View liquidity pools
- Check yield farming opportunities
- Stake tokens
- Track staking rewards

### 📊 Portfolio Management

- View portfolio overview
- Track asset allocation
- Get investment suggestions
- Monitor transaction history

### ⛽ Gas Management

- Check current gas prices
- View gas price history
- Get gas cost estimates
- Find optimal transaction times

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Environment variables (see below)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/lilikoi.git
cd lilikoi
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
# Required for wallet connection
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wallet_connect_project_id

# Required for chat functionality (use either OPENAI_API_KEY or NEXT_PUBLIC_OPENAI_API_KEY)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
# OPENAI_API_KEY=your_openai_api_key

# Required for staking functionality
NEXT_PUBLIC_SFC_CONTRACT_ADDRESS=0xFC00FACE00000000000000000000000000000000
NEXT_PUBLIC_S_TOKEN_ADDRESS=0x8c8687fC965593DFb2F0b4EAeFD55E9D8df348df
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

Lilikoi is built with:

- **Next.js** - React framework for production
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Styling
- **Wagmi** - Ethereum hooks
- **Web3Modal** - Wallet connection
- **OpenAI** - Natural language processing

## Project Structure

```
src/
  ├── app/              # Next.js app directory
  │   ├── components/   # React components
  │   ├── services/     # Business logic and API calls
  │   └── utils/        # Helper functions
  ├── styles/           # Global styles
  └── types/            # TypeScript type definitions
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


