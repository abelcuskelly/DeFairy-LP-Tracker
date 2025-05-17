# DeFairy

A magical financial dashboard for Solana blockchain liquidity providers. DeFairy tracks and visualizes your liquidity pools, earnings, and performance metrics with a magical fairy-themed interface.

## Features

- Connect your Solana wallet to view all your liquidity pools
- Track total balance, profit/loss, APY, and fees harvested
- Monitor which pools are in range and which need rebalancing
- View historical performance data
- Sort and filter your pools by various metrics
- Set automatic rebalancing thresholds for your liquidity positions
- Receive notifications when pools need attention
- Track performance across different time periods (24h, 7d, 30d, all-time)

## User Guide

### Tracking Liquidity Pool Profitability

DeFairy provides comprehensive monitoring of your liquidity positions:

- **Portfolio Summary**: Get an at-a-glance view of your total balance, profit/loss, average APY, and fees harvested across all pools
- **Time Period Analysis**: Toggle between different time periods (24h, 7d, 30d, all-time) to analyze performance trends
- **Pool-by-Pool Breakdown**: Examine detailed metrics for each of your liquidity pools, including:
  - Current balance and token composition
  - Profit or loss (both absolute value and percentage)
  - APY calculation based on fees and price movement
  - Range status (whether your position is actively earning fees)
  - Location (which DEX the pool is on)

### Automatic Rebalancing

One of DeFairy's most powerful features is the ability to set up automatic rebalancing for your liquidity positions:

1. **Token Ratio Thresholds**: Set specific ratios at which you want your position to rebalance
   - Example: Rebalance a SOL/USDC pool when the ratio shifts more than 10% from your target
   
2. **Price-Based Triggers**: Create price targets for either token in your pair
   - Example: Rebalance when SOL reaches $150 or drops below $80
   
3. **Smart Contract Integration**: Our secure smart contracts execute the rebalancing based on your parameters
   - Gas-optimized to minimize transaction costs
   - Configurable slippage tolerance
   - Optional safety limits to prevent execution during extreme volatility

4. **Notification System**: Receive alerts before and after rebalancing occurs
   - Email, browser, or wallet notifications available
   - Detailed transaction reports

## Components and Architecture

### Frontend Components

- **WalletConnectionProvider**: Handles wallet connectivity using Solana wallet adapters
- **Header**: Navigation and wallet connection status
- **PortfolioSummary**: Displays aggregate portfolio metrics
- **PoolsList**: Interactive table of all pools with sorting and filtering
- **RebalancingSettings** (coming soon): Interface for configuring automatic rebalancing thresholds

### Backend Services

- **Blockchain Data Service**: Fetches and processes on-chain data from Solana
- **Analytics Engine**: Calculates performance metrics, APY, and optimal ranges
- **Notification Service**: Manages user alerts and communications
- **Rebalancing Service**: Interfaces with smart contracts to execute position adjustments

## Tech Stack

- Next.js for the frontend and API routes
- Tailwind CSS for styling with custom fairy theme
- Supabase for persistent storage
- Redis for caching blockchain data
- Solana Web3.js for blockchain connectivity
- Framer Motion for magical animations and transitions

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Solana wallet (Phantom, Solflare, etc.)

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (see `.env.example`)
4. Run the development server:
   ```
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://zuvecrpcenaemfeqzunu.supabase.co 
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmVjcnBjZW5hZW1mZXF6dW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NzI1MTIsImV4cCI6MjA2MzA0ODUxMn0.Pg-0XkcHWHz2aoLcrdAnXt52E1eW-Wre1MNZxj-MIQQ
NEXT_PUBLIC_SOLANA_RPC_URL=youhttps://api.mainnet-beta.solana.com/r_solana_rpc_url
REDIS_URL=redis-11525.c80.us-east-1-2.ec2.redns.redis-cloud.com:11525
```

## Deployment

The application is deployed on Vercel. To deploy your own instance:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy with the following build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

## Smart Contract Integration

The rebalancing functionality requires interaction with our smart contracts on Solana:

1. The contracts monitor price feeds and pool ratios in real-time
2. When user-defined thresholds are met, the contract initiates a rebalancing transaction
3. Positions are adjusted to optimal ranges based on current market conditions
4. Transaction details are recorded on-chain and synchronized with the DeFairy interface

## Future Development

- Mobile application with push notifications
- Advanced analytics dashboard with machine learning insights
- Integration with additional DEXes across multiple blockchains
- Yield optimization strategies with automated fee compounding 