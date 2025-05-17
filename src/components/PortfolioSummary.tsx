import React from 'react';

// Define types for our data
interface PeriodData {
  value: string;
  percentage?: string;
  isPositive?: boolean;
}

interface LocationData {
  name: string;
  url: string;
  balance: string;
  poolCount: number;
}

interface PortfolioData {
  totalBalance: string;
  profitLoss: {
    '24h': PeriodData;
    '7d': PeriodData;
    '30d': PeriodData;
    'all': PeriodData;
  };
  apy: {
    '24h': PeriodData;
    '7d': PeriodData;
    '30d': PeriodData;
    'all': PeriodData;
  };
  feesHarvested: {
    '24h': PeriodData;
    '7d': PeriodData;
    '30d': PeriodData;
    'all': PeriodData;
  };
  outOfRange: {
    count: number;
    total: number;
    percentage: string;
  };
  locations: LocationData[];
}

interface PortfolioSummaryProps {
  data: PortfolioData;
  activePeriod: string;
  setActivePeriod: (period: string) => void;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  data,
  activePeriod,
  setActivePeriod,
}) => {
  // Map period keys to display labels
  const periodLabels = {
    '24h': 'Prior 24 Hours',
    '7d': 'Prior Week',
    '30d': 'Prior Month',
    'all': 'All Time',
  };

  // Helper function to format value with color based on positive/negative
  const getValueClassName = (isPositive: boolean | undefined) => {
    if (isPositive === undefined) return 'text-fairy-blue-100';
    return isPositive ? 'text-fairy-green-400' : 'text-red-400';
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-fairy-blue-50 flex items-center">
        <span className="sparkle-effect">LP Portfolio</span>
      </h2>

      <div className="fairy-card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Balance */}
          <div>
            <div className="text-fairy-blue-300 text-sm mb-1">Total Balance</div>
            <div className="text-2xl font-bold text-fairy-blue-50">{data.totalBalance}</div>
          </div>

          {/* Profit or Loss */}
          <div>
            <div className="text-fairy-blue-300 text-sm mb-1 flex justify-between">
              <span>Profit or Loss</span>
              <button 
                className="text-xs text-fairy-purple-300 hover:text-fairy-purple-200"
                onClick={() => setActivePeriod(activePeriod === '24h' ? '7d' : activePeriod === '7d' ? '30d' : activePeriod === '30d' ? 'all' : '24h')}
              >
                {periodLabels[activePeriod as keyof typeof periodLabels]}
              </button>
            </div>
            <div className={`text-2xl font-bold flex items-center ${getValueClassName(data.profitLoss[activePeriod as keyof typeof data.profitLoss].isPositive)}`}>
              {data.profitLoss[activePeriod as keyof typeof data.profitLoss].value}
              {data.profitLoss[activePeriod as keyof typeof data.profitLoss].percentage && (
                <span className="text-sm ml-2">
                  ({data.profitLoss[activePeriod as keyof typeof data.profitLoss].percentage})
                </span>
              )}
            </div>
          </div>

          {/* Average APY */}
          <div>
            <div className="text-fairy-blue-300 text-sm mb-1 flex justify-between">
              <span>Average APY</span>
              <button 
                className="text-xs text-fairy-purple-300 hover:text-fairy-purple-200"
                onClick={() => setActivePeriod(activePeriod === '24h' ? '7d' : activePeriod === '7d' ? '30d' : activePeriod === '30d' ? 'all' : '24h')}
              >
                {periodLabels[activePeriod as keyof typeof periodLabels]}
              </button>
            </div>
            <div className="text-2xl font-bold text-fairy-gold-400">
              {data.apy[activePeriod as keyof typeof data.apy].value}
            </div>
          </div>

          {/* Fees Harvested */}
          <div>
            <div className="text-fairy-blue-300 text-sm mb-1 flex justify-between">
              <span>Fees Harvested</span>
              <button 
                className="text-xs text-fairy-purple-300 hover:text-fairy-purple-200"
                onClick={() => setActivePeriod(activePeriod === '24h' ? '7d' : activePeriod === '7d' ? '30d' : activePeriod === '30d' ? 'all' : '24h')}
              >
                {periodLabels[activePeriod as keyof typeof periodLabels]}
              </button>
            </div>
            <div className="text-2xl font-bold text-fairy-blue-50">
              {data.feesHarvested[activePeriod as keyof typeof data.feesHarvested].value}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Out of Range */}
        <div className="fairy-card">
          <h3 className="text-lg font-semibold mb-3 text-fairy-blue-100">Out of Range</h3>
          <div className="text-2xl font-bold text-fairy-blue-50 mb-2">
            {data.outOfRange.count} of {data.outOfRange.total} pools
          </div>
          <div className="w-full h-2 bg-fairy-blue-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-fairy-purple-500 to-fairy-blue-500"
              style={{ width: data.outOfRange.percentage }}
            ></div>
          </div>
          <div className="mt-2 text-sm text-fairy-blue-300">
            {data.outOfRange.percentage} of your pools need rebalancing
          </div>
        </div>

        {/* Locations */}
        <div className="fairy-card">
          <h3 className="text-lg font-semibold mb-3 text-fairy-blue-100">Location</h3>
          <div className="space-y-3">
            {data.locations.map((location, index) => (
              <div key={index} className="flex justify-between items-center">
                <a 
                  href={location.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-fairy-purple-300 hover:text-fairy-purple-200 transition"
                >
                  {location.name}
                </a>
                <div>
                  <span className="text-fairy-blue-50 font-medium">{location.balance}</span>
                  <span className="text-fairy-blue-300 text-sm ml-2">in {location.poolCount} pools</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary; 