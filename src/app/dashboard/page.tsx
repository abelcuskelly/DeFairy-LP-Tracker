'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';

// Components (to be created)
import PortfolioSummary from '../../components/PortfolioSummary';
import PoolsList from '../../components/PoolsList';
import Header from '../../components/Header';

// Mock data provider (to be replaced with actual blockchain data)
import { fetchWalletData } from '../../lib/mockData';

const Dashboard = () => {
  const searchParams = useSearchParams();
  const paramAddress = searchParams?.get('address') || '';
  
  // Get wallet from wallet adapter
  const { publicKey, connected } = useWallet();
  const connectedAddress = publicKey?.toString() || '';
  
  // Use connected wallet address if available, otherwise use the address from URL params
  const walletAddress = connected && connectedAddress ? connectedAddress : paramAddress;
  
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState(null);
  const [poolsData, setPoolsData] = useState([]);
  const [error, setError] = useState('');

  // Load wallet data
  useEffect(() => {
    const loadData = async () => {
      if (!walletAddress) {
        setError('No wallet address provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // This would be replaced with actual blockchain data fetching
        const data = await fetchWalletData(walletAddress);
        setPortfolioData(data.portfolio);
        setPoolsData(data.pools);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load wallet data:', err);
        setError('Failed to load wallet data. Please try again.');
        setIsLoading(false);
      }
    };

    loadData();
  }, [walletAddress]);

  // Period state for expandable sections (24h, 7d, 30d, all)
  const [activePeriod, setActivePeriod] = useState('24h');

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fairy-purple-500 mb-4"></div>
              <p className="text-fairy-blue-100">Summoning your magical data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-fairy-purple-300 text-2xl mb-4">{error}</div>
            <button
              onClick={() => window.location.href = '/'}
              className="fairy-button"
            >
              Return Home
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-8 text-center text-fairy-blue-50">
              Your Magical DeFi Dashboard
            </h1>
            
            {portfolioData && (
              <PortfolioSummary 
                data={portfolioData} 
                activePeriod={activePeriod} 
                setActivePeriod={setActivePeriod} 
              />
            )}
            
            {poolsData.length > 0 && (
              <PoolsList 
                pools={poolsData} 
                activePeriod={activePeriod} 
                setActivePeriod={setActivePeriod} 
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 