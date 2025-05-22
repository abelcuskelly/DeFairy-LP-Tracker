// API management for fetching data from various sources
class APIManager {
    constructor() {
        this.baseURLs = {
            jupiter: 'https://price.jup.ag/v4',
            coingecko: 'https://api.coingecko.com/api/v3',
            helius: 'https://api.helius.xyz/v0',
            orca: 'https://api.orca.so/v1',
            raydium: 'https://api.raydium.io/v2'
        };
        
        this.heliusApiKey = 'b9ca8559-01e8-4823-8fa2-c7b2b5b0755c';
        this.retryCount = 3;
        this.retryDelay = 1000;
        this.websocketConnected = false;
        this.subscribedWallets = new Set();
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

    // Get user's liquidity positions using Helius
    async getUserPositions(walletAddress) {
        try {
            if (!walletAddress) {
                throw new Error('Wallet address is required');
            }
            
            showNotification('Fetching positions from Helius...', 'info');
            
            // Identify LP positions from token accounts
            const lpPositions = await heliusClient.identifyLPPositions(walletAddress);
            
            if (lpPositions.length === 0) {
                showNotification('No LP positions found for this wallet', 'info');
                return { orca: [], raydium: [] };
            }
            
            // Organize positions by DEX
            const positions = {
                orca: [],
                raydium: []
            };
            
            // Fetch additional data for each position
            for (const position of lpPositions) {
                // Get pool data (APY, fees, etc.)
                const poolData = await heliusClient.getLPPoolData(position.lpTokenMint);
                
                // Calculate position value
                const lpTokenAmount = position.amount || 0;
                const token0Value = lpTokenAmount * poolData.token0.price / 2; // Simplified - should use actual ratio
                const token1Value = lpTokenAmount * poolData.token1.price / 2; // Simplified - should use actual ratio
                const totalValue = token0Value + token1Value;
                
                // Create position object
                const positionData = {
                    pool: position.pool,
                    balance: totalValue,
                    token0: { 
                        symbol: poolData.token0.symbol, 
                        amount: lpTokenAmount / 2, // Simplified 
                        price: poolData.token0.price 
                    },
                    token1: { 
                        symbol: poolData.token1.symbol, 
                        amount: lpTokenAmount / 2, // Simplified
                        price: poolData.token1.price 
                    },
                    feesEarned: poolData.feesEarned,
                    inRange: poolData.inRange,
                    apy24h: poolData.apy24h,
                    pl24h: totalValue * poolData.apy24h / 365 // Simple estimation
                };
                
                // Add to appropriate DEX
                if (poolData.location.toLowerCase() === 'orca') {
                    positions.orca.push(positionData);
                } else if (poolData.location.toLowerCase() === 'raydium') {
                    positions.raydium.push(positionData);
                }
            }
            
            // Subscribe to wallet updates via WebSocket for real-time data
            this.subscribeToWalletUpdates(walletAddress);
            
            return positions;
        } catch (error) {
            console.error('Error fetching user positions:', error);
            showNotification('Failed to fetch LP positions: ' + error.message, 'error');
            // Fall back to mock data for development/demo purposes
            return this.getMockPositions();
        }
    }

    // Subscribe to wallet updates via WebSocket
    subscribeToWalletUpdates(walletAddress) {
        if (this.subscribedWallets.has(walletAddress)) {
            return; // Already subscribed
        }
        
        try {
            // Initialize WebSocket if not already connected
            if (!this.websocketConnected) {
                heliusClient.connectWebSocket();
                this.websocketConnected = true;
                
                // Set up event listener for account updates
                heliusClient.addEventListener('account', this.handleAccountUpdate.bind(this));
            }
            
            // Subscribe to the wallet address
            heliusClient.subscribeToAccounts([walletAddress]);
            this.subscribedWallets.add(walletAddress);
            
        } catch (error) {
            console.error('Error subscribing to wallet updates:', error);
        }
    }
    
    // Handle account update from WebSocket
    handleAccountUpdate(accountInfo) {
        try {
            // Check if this is an LP token account
            // If so, refresh the UI with new data
            console.log('Account update received:', accountInfo);
            
            // In a real implementation, we would update the UI with new data
            // For now, just log the update
        } catch (error) {
            console.error('Error handling account update:', error);
        }
    }

    // Mock data for development/fallback
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
    
    // Auto-rebalancing functionality - placeholder for future development
    async getRebalancingRecommendations(positions) {
        try {
            const allPools = [...(positions.orca || []), ...(positions.raydium || [])];
            const outOfRangePools = allPools.filter(pool => !pool.inRange);
            
            if (outOfRangePools.length === 0) {
                return {
                    recommendations: [],
                    message: 'All positions are in range. No rebalancing needed.'
                };
            }
            
            // Simple recommendations for now
            const recommendations = outOfRangePools.map(pool => {
                return {
                    pool: pool.pool,
                    action: 'rebalance',
                    reason: 'Position is out of range',
                    recommendation: 'Withdraw, rebalance tokens to 50/50, and re-deposit'
                };
            });
            
            return {
                recommendations,
                message: `${outOfRangePools.length} positions need rebalancing`
            };
        } catch (error) {
            console.error('Error generating rebalancing recommendations:', error);
            return {
                recommendations: [],
                message: 'Error generating recommendations: ' + error.message
            };
        }
    }
}

// Global API manager instance
const apiManager = new APIManager(); 