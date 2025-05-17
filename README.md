# DeFairy

A magical financial dashboard for Solana blockchain liquidity providers. DeFairy tracks and visualizes your liquidity pools, earnings, and performance metrics with a magical fairy-themed interface.

## Features

- Connect your Solana wallet to view all your liquidity pools
- Track total balance, profit/loss, APY, and fees harvested
- Monitor which pools are in range and which need rebalancing
- View historical performance data
- Sort and filter your pools by various metrics

## Tech Stack

- Next.js for the frontend and API routes
- Tailwind CSS for styling
- Supabase for persistent storage
- Redis for caching
- Solana Web3.js for blockchain connectivity
- Framer Motion for animations

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_SOLANA_RPC_URL=your_solana_rpc_url
REDIS_URL=your_redis_url
``` 