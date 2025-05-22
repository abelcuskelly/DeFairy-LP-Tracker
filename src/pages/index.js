import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import PortfolioStats from '../components/PortfolioStats';
import PoolsList from '../components/PoolsList';
import AIAssistant from '../components/AIAssistant';
import { apiManager } from '../lib/api';
import { showNotification } from '../lib/wallet';

// Default metrics state
const defaultMetrics = {
  totalBalance: 0,
  totalFeesToday: 0,
  totalPL24h: 0,
  avgAPY: 0,
  outOfRangePools: 0,
  totalPools: 0,
  pools: []
};

export default function Home() {
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [isLoading, setIsLoading] = useState(false);

  const loadPortfolio = async (walletAddress) => {
    if (isLoading) return;
    
    setIsLoading(true);
    showNotification('Loading portfolio data...', 'info');
    
    try {
      // Show loading states
      setMetrics(defaultMetrics);
      
      // Fetch user positions from API
      const positions = await apiManager.getUserPositions(walletAddress);
      
      // Calculate metrics
      const newMetrics = apiManager.calculatePortfolioMetrics(positions);
      
      // Update state
      setMetrics(newMetrics);
      
      showNotification('Portfolio loaded successfully! ✨', 'success');
      
    } catch (error) {
      console.error('Error loading portfolio:', error);
      showNotification('Failed to load portfolio: ' + error.message, 'error');
      setMetrics(defaultMetrics);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>DeFairy - Magical LP Portfolio Tracker</title>
        <meta name="description" content="Track your Solana liquidity positions magically" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="magic-bg"></div>
      
      {/* Header with wallet connection */}
      <Header onLoadPortfolio={loadPortfolio} />

      <div className="container">
        {/* Portfolio stats section */}
        <PortfolioStats metrics={metrics} />
        
        {/* Pools list section */}
        <PoolsList pools={metrics.pools} />
      </div>

      {/* AI Assistant */}
      <AIAssistant />
    </>
  );
} 