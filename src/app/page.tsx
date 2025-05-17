'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from '../components/WalletConnectButton';

const HomePage: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const { publicKey, connected } = useWallet();

  const handleSubmitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (walletAddress.trim()) {
      window.location.href = `/dashboard?address=${walletAddress}`;
    }
  };

  // If wallet is connected, redirect to dashboard
  useEffect(() => {
    if (connected && publicKey) {
      // Use publicKey instead of the manual input if connected via wallet
      const connectedAddress = publicKey.toString();
      window.location.href = `/dashboard?address=${connectedAddress}`;
    }
  }, [connected, publicKey]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 sparkle-effect text-gradient bg-gradient-to-r from-fairy-green-300 via-fairy-blue-300 to-fairy-purple-300 bg-clip-text text-transparent">
            DeFairy
          </h1>
          <p className="text-xl mb-8 text-fairy-blue-100 max-w-2xl">
            The magical dashboard for Solana DeFi liquidity providers. Track your pools, monitor
            yield, and rebalance positions with fairy-powered precision.
          </p>
          
          <div className="fairy-card max-w-md w-full mx-auto p-6">
            <form onSubmit={handleSubmitAddress} className="mb-4">
              <div className="mb-4">
                <label htmlFor="walletAddress" className="block text-sm font-medium text-fairy-blue-100 mb-2">
                  Enter Solana Wallet Address
                </label>
                <input
                  type="text"
                  id="walletAddress"
                  placeholder="Enter your Solana wallet address..."
                  className="fairy-input w-full"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="fairy-button w-full mb-4"
                disabled={!walletAddress.trim()}
              >
                View Dashboard
              </button>
            </form>
            
            <div className="text-center">
              <p className="text-fairy-blue-200 mb-3">- or -</p>
              <div className="w-full">
                <WalletConnectButton />
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="fairy-card">
            <div className="text-fairy-gold-400 text-2xl font-bold mb-2">Track</div>
            <p className="text-fairy-blue-100">Monitor all your Solana DeFi positions in one magical dashboard</p>
          </div>
          <div className="fairy-card">
            <div className="text-fairy-purple-300 text-2xl font-bold mb-2">Analyze</div>
            <p className="text-fairy-blue-100">Get real-time insights and historical performance data</p>
          </div>
          <div className="fairy-card">
            <div className="text-fairy-green-400 text-2xl font-bold mb-2">Optimize</div>
            <p className="text-fairy-blue-100">Set rebalancing thresholds to maximize your yield</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HomePage; 