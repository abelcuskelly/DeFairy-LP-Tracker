// Mock data provider for DeFairy
// This would be replaced with actual blockchain data in production

export interface PeriodData {
  value: string;
  percentage?: string;
  isPositive?: boolean;
}

export interface LocationData {
  name: string;
  url: string;
  balance: string;
  poolCount: number;
}

export interface PoolData {
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

export interface PortfolioData {
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

interface WalletData {
  portfolio: PortfolioData;
  pools: PoolData[];
}

// Mock data for a sample wallet
const mockWalletData: WalletData = {
  portfolio: {
    totalBalance: '$12,458.64',
    profitLoss: {
      '24h': { value: '+$143.27', percentage: '1.16%', isPositive: true },
      '7d': { value: '+$487.92', percentage: '4.08%', isPositive: true },
      '30d': { value: '-$215.36', percentage: '1.7%', isPositive: false },
      'all': { value: '+$7,486.19', percentage: '150.84%', isPositive: true },
    },
    apy: {
      '24h': { value: '287%', isPositive: true },
      '7d': { value: '103%', isPositive: true },
      '30d': { value: '64%', isPositive: true },
      'all': { value: '42%', isPositive: true },
    },
    feesHarvested: {
      '24h': { value: '$68.43', isPositive: true },
      '7d': { value: '$412.18', isPositive: true },
      '30d': { value: '$1,743.25', isPositive: true },
      'all': { value: '$3,943.87', isPositive: true },
    },
    outOfRange: {
      count: 2,
      total: 7,
      percentage: '28.6%',
    },
    locations: [
      {
        name: 'Orca',
        url: 'https://www.orca.so/pools',
        balance: '$7,984.33',
        poolCount: 3,
      },
      {
        name: 'Meteora',
        url: 'https://app.meteora.ag/pools',
        balance: '$2,731.09',
        poolCount: 2,
      },
      {
        name: 'Raydium',
        url: 'https://raydium.io/pools',
        balance: '$1,743.22',
        poolCount: 2,
      },
    ],
  },
  pools: [
    {
      id: 'pool-1',
      pair: 'SOL/USDC',
      token0: 'SOL',
      token1: 'USDC',
      balance: '$3,245.67',
      profitLoss: {
        '24h': { value: '+$57.82', percentage: '1.81%', isPositive: true },
        '7d': { value: '+$178.51', percentage: '5.8%', isPositive: true },
        '30d': { value: '+$412.20', percentage: '14.5%', isPositive: true },
        'all': { value: '+$1,845.67', percentage: '131.8%', isPositive: true },
      },
      apy: {
        '24h': { value: '324%', isPositive: true },
        '7d': { value: '124%', isPositive: true },
        '30d': { value: '87%', isPositive: true },
        'all': { value: '56%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$28.45', isPositive: true },
        '7d': { value: '$187.34', isPositive: true },
        '30d': { value: '$745.28', isPositive: true },
        'all': { value: '$1,453.87', isPositive: true },
      },
      inRange: true,
      location: {
        name: 'Orca',
        url: 'https://www.orca.so/pools',
      },
    },
    {
      id: 'pool-2',
      pair: 'BTC/USDC',
      token0: 'BTC',
      token1: 'USDC',
      balance: '$2,731.09',
      profitLoss: {
        '24h': { value: '-$34.15', percentage: '1.24%', isPositive: false },
        '7d': { value: '+$98.32', percentage: '3.73%', isPositive: true },
        '30d': { value: '-$167.45', percentage: '5.8%', isPositive: false },
        'all': { value: '+$1,231.09', percentage: '82.1%', isPositive: true },
      },
      apy: {
        '24h': { value: '87%', isPositive: true },
        '7d': { value: '94%', isPositive: true },
        '30d': { value: '62%', isPositive: true },
        'all': { value: '38%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$15.78', isPositive: true },
        '7d': { value: '$94.26', isPositive: true },
        '30d': { value: '$387.45', isPositive: true },
        'all': { value: '$842.37', isPositive: true },
      },
      inRange: true,
      location: {
        name: 'Meteora',
        url: 'https://app.meteora.ag/pools',
      },
    },
    {
      id: 'pool-3',
      pair: 'ETH/SOL',
      token0: 'ETH',
      token1: 'SOL',
      balance: '$2,456.32',
      profitLoss: {
        '24h': { value: '+$42.87', percentage: '1.78%', isPositive: true },
        '7d': { value: '+$87.34', percentage: '3.68%', isPositive: true },
        '30d': { value: '-$132.78', percentage: '5.13%', isPositive: false },
        'all': { value: '+$956.32', percentage: '63.8%', isPositive: true },
      },
      apy: {
        '24h': { value: '276%', isPositive: true },
        '7d': { value: '89%', isPositive: true },
        '30d': { value: '54%', isPositive: true },
        'all': { value: '37%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$17.45', isPositive: true },
        '7d': { value: '$78.34', isPositive: true },
        '30d': { value: '$324.67', isPositive: true },
        'all': { value: '$762.45', isPositive: true },
      },
      inRange: true,
      location: {
        name: 'Orca',
        url: 'https://www.orca.so/pools',
      },
    },
    {
      id: 'pool-4',
      pair: 'JUP/USDC',
      token0: 'JUP',
      token1: 'USDC',
      balance: '$1,243.78',
      profitLoss: {
        '24h': { value: '+$27.54', percentage: '2.27%', isPositive: true },
        '7d': { value: '+$76.34', percentage: '6.54%', isPositive: true },
        '30d': { value: '+$187.34', percentage: '17.73%', isPositive: true },
        'all': { value: '+$743.78', percentage: '148.8%', isPositive: true },
      },
      apy: {
        '24h': { value: '367%', isPositive: true },
        '7d': { value: '142%', isPositive: true },
        '30d': { value: '86%', isPositive: true },
        'all': { value: '58%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$12.75', isPositive: true },
        '7d': { value: '$67.34', isPositive: true },
        '30d': { value: '$276.45', isPositive: true },
        'all': { value: '$584.32', isPositive: true },
      },
      inRange: false,
      location: {
        name: 'Raydium',
        url: 'https://raydium.io/pools',
      },
    },
    {
      id: 'pool-5',
      pair: 'BONK/SOL',
      token0: 'BONK',
      token1: 'SOL',
      balance: '$987.45',
      profitLoss: {
        '24h': { value: '+$23.45', percentage: '2.43%', isPositive: true },
        '7d': { value: '+$54.23', percentage: '5.81%', isPositive: true },
        '30d': { value: '-$87.34', percentage: '8.12%', isPositive: false },
        'all': { value: '+$687.45', percentage: '228.5%', isPositive: true },
      },
      apy: {
        '24h': { value: '456%', isPositive: true },
        '7d': { value: '187%', isPositive: true },
        '30d': { value: '95%', isPositive: true },
        'all': { value: '67%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$9.87', isPositive: true },
        '7d': { value: '$45.34', isPositive: true },
        '30d': { value: '$187.45', isPositive: true },
        'all': { value: '$456.32', isPositive: true },
      },
      inRange: true,
      location: {
        name: 'Orca',
        url: 'https://www.orca.so/pools',
      },
    },
    {
      id: 'pool-6',
      pair: 'AVAX/USDC',
      token0: 'AVAX',
      token1: 'USDC',
      balance: '$876.34',
      profitLoss: {
        '24h': { value: '+$15.67', percentage: '1.82%', isPositive: true },
        '7d': { value: '-$23.45', percentage: '2.61%', isPositive: false },
        '30d': { value: '-$45.67', percentage: '4.95%', isPositive: false },
        'all': { value: '+$376.34', percentage: '75.3%', isPositive: true },
      },
      apy: {
        '24h': { value: '123%', isPositive: true },
        '7d': { value: '76%', isPositive: true },
        '30d': { value: '45%', isPositive: true },
        'all': { value: '27%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$7.65', isPositive: true },
        '7d': { value: '$32.45', isPositive: true },
        '30d': { value: '$134.56', isPositive: true },
        'all': { value: '$287.45', isPositive: true },
      },
      inRange: true,
      location: {
        name: 'Meteora',
        url: 'https://app.meteora.ag/pools',
      },
    },
    {
      id: 'pool-7',
      pair: 'RAY/USDC',
      token0: 'RAY',
      token1: 'USDC',
      balance: '$917.99',
      profitLoss: {
        '24h': { value: '+$9.87', percentage: '1.09%', isPositive: true },
        '7d': { value: '+$16.63', percentage: '1.85%', isPositive: true },
        '30d': { value: '+$43.21', percentage: '4.94%', isPositive: true },
        'all': { value: '+$617.99', percentage: '206.0%', isPositive: true },
      },
      apy: {
        '24h': { value: '87%', isPositive: true },
        '7d': { value: '56%', isPositive: true },
        '30d': { value: '42%', isPositive: true },
        'all': { value: '31%', isPositive: true },
      },
      feesHarvested: {
        '24h': { value: '$4.56', isPositive: true },
        '7d': { value: '$24.78', isPositive: true },
        '30d': { value: '$98.76', isPositive: true },
        'all': { value: '$234.56', isPositive: true },
      },
      inRange: false,
      location: {
        name: 'Raydium',
        url: 'https://raydium.io/pools',
      },
    },
  ],
};

// Function to simulate fetching wallet data
export const fetchWalletData = async (walletAddress: string): Promise<WalletData> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For testing, always return the mock data regardless of wallet address
  return mockWalletData;
}; 