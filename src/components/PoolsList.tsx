import React, { useState } from 'react';

// Define types for our data
interface PeriodData {
  value: string;
  percentage?: string;
  isPositive?: boolean;
}

interface PoolData {
  id: string;
  pair: string;
  token0: string;
  token1: string;
  balance: string;
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
  inRange: boolean;
  location: {
    name: string;
    url: string;
  };
}

interface PoolsListProps {
  pools: PoolData[];
  activePeriod: string;
  setActivePeriod: (period: string) => void;
}

const PoolsList: React.FC<PoolsListProps> = ({
  pools,
  activePeriod,
  setActivePeriod,
}) => {
  // Sort state
  const [sortField, setSortField] = useState<string>('balance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Sort pools based on current sort settings
  const sortedPools = [...pools].sort((a, b) => {
    let valueA, valueB;

    // Extract values based on sort field
    switch (sortField) {
      case 'pair':
        valueA = a.pair;
        valueB = b.pair;
        break;
      case 'balance':
        valueA = parseFloat(a.balance.replace(/[^0-9.-]+/g, ''));
        valueB = parseFloat(b.balance.replace(/[^0-9.-]+/g, ''));
        break;
      case 'profitLoss':
        valueA = parseFloat(a.profitLoss[activePeriod as keyof typeof a.profitLoss].value.replace(/[^0-9.-]+/g, ''));
        valueB = parseFloat(b.profitLoss[activePeriod as keyof typeof b.profitLoss].value.replace(/[^0-9.-]+/g, ''));
        break;
      case 'apy':
        valueA = parseFloat(a.apy[activePeriod as keyof typeof a.apy].value.replace(/[^0-9%.-]+/g, ''));
        valueB = parseFloat(b.apy[activePeriod as keyof typeof b.apy].value.replace(/[^0-9%.-]+/g, ''));
        break;
      case 'feesHarvested':
        valueA = parseFloat(a.feesHarvested[activePeriod as keyof typeof a.feesHarvested].value.replace(/[^0-9.-]+/g, ''));
        valueB = parseFloat(b.feesHarvested[activePeriod as keyof typeof b.feesHarvested].value.replace(/[^0-9.-]+/g, ''));
        break;
      case 'inRange':
        valueA = a.inRange ? 1 : 0;
        valueB = b.inRange ? 1 : 0;
        break;
      case 'location':
        valueA = a.location.name;
        valueB = b.location.name;
        break;
      default:
        valueA = a.balance;
        valueB = b.balance;
    }

    // Compare and apply sort direction
    if (valueA < valueB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Handle sorting column click
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render sort indicator arrow
  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-fairy-blue-50 flex items-center">
        <span className="sparkle-effect">Your Pools</span>
        <span className="ml-2 text-sm text-fairy-blue-300">({pools.length})</span>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-fairy-blue-800/30">
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('pair')}
              >
                Pool <SortIndicator field="pair" />
              </th>
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('balance')}
              >
                Balance <SortIndicator field="balance" />
              </th>
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('profitLoss')}
              >
                Profit or Loss
                <button 
                  className="text-xs ml-2 text-fairy-purple-300 hover:text-fairy-purple-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePeriod(activePeriod === '24h' ? '7d' : activePeriod === '7d' ? '30d' : activePeriod === '30d' ? 'all' : '24h');
                  }}
                >
                  ({periodLabels[activePeriod as keyof typeof periodLabels]})
                </button>
                <SortIndicator field="profitLoss" />
              </th>
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('apy')}
              >
                Average APY
                <button 
                  className="text-xs ml-2 text-fairy-purple-300 hover:text-fairy-purple-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePeriod(activePeriod === '24h' ? '7d' : activePeriod === '7d' ? '30d' : activePeriod === '30d' ? 'all' : '24h');
                  }}
                >
                  ({periodLabels[activePeriod as keyof typeof periodLabels]})
                </button>
                <SortIndicator field="apy" />
              </th>
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('feesHarvested')}
              >
                Fees Harvested
                <button 
                  className="text-xs ml-2 text-fairy-purple-300 hover:text-fairy-purple-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePeriod(activePeriod === '24h' ? '7d' : activePeriod === '7d' ? '30d' : activePeriod === '30d' ? 'all' : '24h');
                  }}
                >
                  ({periodLabels[activePeriod as keyof typeof periodLabels]})
                </button>
                <SortIndicator field="feesHarvested" />
              </th>
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('inRange')}
              >
                In Range <SortIndicator field="inRange" />
              </th>
              <th 
                className="pb-3 text-fairy-blue-300 font-medium cursor-pointer hover:text-fairy-purple-300 transition-colors"
                onClick={() => handleSort('location')}
              >
                Location <SortIndicator field="location" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPools.map((pool) => (
              <tr key={pool.id} className="border border-fairy-blue-800/20 my-4 magical-border">
                <td className="p-4 text-fairy-blue-50 font-medium">{pool.pair}</td>
                <td className="p-4 text-fairy-blue-50">{pool.balance}</td>
                <td className={`p-4 font-medium ${getValueClassName(pool.profitLoss[activePeriod as keyof typeof pool.profitLoss].isPositive)}`}>
                  {pool.profitLoss[activePeriod as keyof typeof pool.profitLoss].value}
                  {pool.profitLoss[activePeriod as keyof typeof pool.profitLoss].percentage && (
                    <span className="text-xs ml-1 opacity-80">
                      ({pool.profitLoss[activePeriod as keyof typeof pool.profitLoss].percentage})
                    </span>
                  )}
                </td>
                <td className="p-4 text-fairy-gold-400 font-medium">
                  {pool.apy[activePeriod as keyof typeof pool.apy].value}
                </td>
                <td className="p-4 text-fairy-blue-50">
                  {pool.feesHarvested[activePeriod as keyof typeof pool.feesHarvested].value}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${pool.inRange ? 'bg-fairy-green-400/20 text-fairy-green-400' : 'bg-red-400/20 text-red-400'}`}>
                    {pool.inRange ? 'In Range' : 'Out of Range'}
                  </span>
                </td>
                <td className="p-4">
                  <a 
                    href={pool.location.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-fairy-purple-300 hover:text-fairy-purple-200 transition"
                  >
                    {pool.location.name}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PoolsList; 