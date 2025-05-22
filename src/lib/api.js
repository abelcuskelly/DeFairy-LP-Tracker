// API management for fetching data from various sources
class APIManager {
    constructor() {
        this.baseURLs = {
            jupiter: 'https://price.jup.ag/v4',
            coingecko: 'https://api.coingecko.com/api/v3',
            helius: 'https://api.helius.xyz/v0', // Add your API key
            orca: 'https://api.orca.so/v1',
            raydium: 'https://api.raydium.io/v2'
        };
        
        this.retryCount = 3;
        this.retryDelay = 1000;
    }

    async fetchWithRetry(url, options = {}, retries = this.retryCount) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (retries > 0) {
                console.warn(`API call failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    // Jupiter API - Primary price source
    async getTokenPrices(tokenAddresses) {
        try {
            const addresses = Array.isArray(tokenAddresses) ? tokenAddresses.join(',') : tokenAddresses;
            const url = `${this.baseURLs.jupiter}/price?ids=${addresses}`;
            return await this.fetchWithRetry(url);
        } catch (error) {
            console.error('Jupiter API failed, trying fallback:', error);
            return this.getTokenPricesCoingecko(tokenAddresses);
        }
    }

    // CoinGecko API - Fallback price source
    async getTokenPricesCoingecko(tokenAddresses) {
        try {
            const url = `${this.baseURLs.coingecko}/simple/price?ids=${tokenAddresses}&vs_currencies=usd`;
            return await this.fetchWithRetry(url);
        } catch (error) {
            console.error('CoinGecko API failed:', error);
            throw new Error('All price APIs failed');
        }
    }

    // Get user's liquidity positions
    async getUserPositions(walletAddress) {
        try {
            // This will be implemented with actual DEX APIs
            // For now, return mock data
            return this.getMockPositions();
        } catch (error) {
            console.error('Error fetching user positions:', error);
            throw error;
        }
    }

    // Mock data for development
    getMockPositions() {
        return {
            orca: [
                {
                    pool: 'SOL/USDC',
                    balance: 4567.89,
                    token0: { symbol: 'SOL', amount: 12.5, price: 180.45 },
                    token1: { symbol: 'USDC', amount: 2314.12, price: 1.00 },
                    feesEarned: 23.45,
                    inRange: true,
                    apy24h: 18.5,
                    pl24h: 123.45
                }
            ],
            raydium: [
                {
                    pool: 'WBTC/ETH',
                    balance: 8901.23,
                    token0: { symbol: 'WBTC', amount: 0.15, price: 45234.56 },
                    token1: { symbol: 'ETH', amount: 2.1, price: 2145.78 },
                    feesEarned: 45.67,
                    inRange: true,
                    apy24h: 12.3,
                    pl24h: 234.56
                },
                {
                    pool: 'USDT/USDC',
                    balance: 2345.67,
                    token0: { symbol: 'USDT', amount: 1172.83, price: 1.00 },
                    token1: { symbol: 'USDC', amount: 1172.84, price: 1.00 },
                    feesEarned: 12.34,
                    inRange: false,
                    apy24h: 8.7,
                    pl24h: -12.34
                }
            ]
        };
    }

    // Calculate portfolio metrics
    calculatePortfolioMetrics(positions) {
        const allPools = [...(positions.orca || []), ...(positions.raydium || [])];
        
        const totalBalance = allPools.reduce((sum, pool) => sum + pool.balance, 0);
        const totalFeesToday = allPools.reduce((sum, pool) => sum + pool.feesEarned, 0);
        const totalPL24h = allPools.reduce((sum, pool) => sum + pool.pl24h, 0);
        const avgAPY = allPools.length > 0 ? 
            allPools.reduce((sum, pool) => sum + pool.apy24h, 0) / allPools.length : 0;
        
        const outOfRangePools = allPools.filter(pool => !pool.inRange).length;
        const totalPools = allPools.length;
        
        return {
            totalBalance,
            totalFeesToday,
            totalPL24h,
            avgAPY,
            outOfRangePools,
            totalPools,
            pools: allPools
        };
    }
}

// Create singleton instance
export const apiManager = typeof window !== 'undefined' ? new APIManager() : null; 