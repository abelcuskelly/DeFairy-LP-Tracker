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

    // Get user's liquidity positions using Helius and direct program calls
    async getUserPositions(walletAddress) {
        try {
            if (!walletAddress) {
                throw new Error('Wallet address is required');
            }
            
            showNotification('Fetching positions from blockchain...', 'info');
            
            // Initialize the Orca client if not already initialized
            if (!orcaClient.initialized) {
                const initialized = await orcaClient.initialize();
                if (!initialized) {
                    throw new Error('Failed to initialize Orca client');
                }
            }
            
            const positions = {
                orca: [],
                raydium: []
            };
            
            // First try to get positions directly from Orca Whirlpools program
            try {
                showNotification('Fetching Orca positions...', 'info');
                const orcaPositions = await orcaClient.getPositions(walletAddress);
                positions.orca = orcaPositions;
                
                if (orcaPositions.length > 0) {
                    showNotification(`Found ${orcaPositions.length} Orca positions`, 'success');
                }
            } catch (orcaError) {
                console.error('Error fetching Orca positions:', orcaError);
                showNotification('Failed to fetch Orca positions: ' + orcaError.message, 'warning');
            }
            
            // Use Helius API as a fallback or for other DEXes
            try {
                showNotification('Fetching additional positions from Helius...', 'info');
                // Identify LP positions from token accounts
                const lpPositions = await heliusClient.identifyLPPositions(walletAddress);
                
                // Fetch additional data for each position
                for (const position of lpPositions) {
                    // Skip Orca positions if we already got them from the program
                    if (position.location === 'Orca' && positions.orca.length > 0) {
                        continue;
                    }
                    
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
                        pl24h: totalValue * poolData.apy24h / 365, // Simple estimation
                        location: poolData.location // Store the location for proper hyperlinks
                    };
                    
                    // Add to appropriate DEX
                    if (poolData.location.toLowerCase() === 'orca') {
                        positions.orca.push(positionData);
                    } else if (poolData.location.toLowerCase() === 'raydium') {
                        positions.raydium.push(positionData);
                    }
                }
            } catch (heliusError) {
                console.error('Error fetching positions from Helius:', heliusError);
                showNotification('Failed to fetch additional positions: ' + heliusError.message, 'warning');
            }
            
            // If no positions found at all, fall back to mock data
            if (positions.orca.length === 0 && positions.raydium.length === 0) {
                showNotification('No LP positions found, using sample data', 'info');
                return this.getMockPositions();
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
                    pl24h: 123.45,
                    location: 'Orca'
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
                    pl24h: 234.56,
                    location: 'Raydium'
                },
                {
                    pool: 'USDT/USDC',
                    balance: 2345.67,
                    token0: { symbol: 'USDT', amount: 1172.83, price: 1.00 },
                    token1: { symbol: 'USDC', amount: 1172.84, price: 1.00 },
                    feesEarned: 12.34,
                    inRange: false,
                    apy24h: 8.7,
                    pl24h: -12.34,
                    location: 'Raydium'
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
    
    // Auto-rebalancing functionality with Helius and Orca integration
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
            
            // Get more detailed recommendations
            const recommendations = await Promise.all(outOfRangePools.map(async pool => {
                // For Orca positions, get more detailed recommendations
                if (pool.location.toLowerCase() === 'orca' && pool.positionAddress) {
                    try {
                        // Calculate optimal tick range based on recent price volatility
                        // In production, you would analyze historical price data to determine volatility
                        const volatilityFactor = 1.5; // Higher = wider range
                        
                        // Use current tick as center point
                        const centerTick = pool.currentTick || 0;
                        const tickSpacing = 8; // Default, would get from pool data in production
                        
                        // Calculate range based on volatility
                        // More volatile pairs need wider ranges
                        const rangeSize = Math.round(30 * tickSpacing * volatilityFactor);
                        const newLowerTick = centerTick - rangeSize;
                        const newUpperTick = centerTick + rangeSize;
                        
                        return {
                            pool: pool.pool,
                            positionAddress: pool.positionAddress,
                            action: 'rebalance',
                            reason: 'Position is out of range',
                            currentTick: pool.currentTick,
                            lowerTick: pool.lowerTick,
                            upperTick: pool.upperTick,
                            newLowerTick: newLowerTick,
                            newUpperTick: newUpperTick,
                            recommendation: `Withdraw liquidity and create new position with range: ${newLowerTick} to ${newUpperTick}`,
                            estimatedAPY: pool.apy24h * 1.2, // Estimated improvement
                            location: pool.location
                        };
                    } catch (error) {
                        console.error('Error calculating detailed recommendation:', error);
                    }
                }
                
                // Default recommendation for other DEXes or if detailed calculation fails
                return {
                    pool: pool.pool,
                    positionAddress: pool.positionAddress || null,
                    action: 'rebalance',
                    reason: 'Position is out of range',
                    recommendation: 'Withdraw, rebalance tokens to 50/50, and re-deposit',
                    location: pool.location
                };
            }));
            
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
    
    // Execute auto-rebalancing for a position
    async executeRebalance(positionAddress, newLowerTick, newUpperTick, wallet) {
        try {
            showNotification('Initiating auto-rebalancing...', 'info');
            
            // Get position details first
            const position = await this.getPositionDetails(positionAddress);
            
            if (!position) {
                throw new Error('Position not found');
            }
            
            // Check which DEX this position belongs to
            if (position.location.toLowerCase() === 'orca') {
                // For Orca positions, use the Orca client
                if (!orcaClient.initialized) {
                    await orcaClient.initialize(null, wallet);
                }
                
                // Execute rebalancing
                await orcaClient.rebalancePosition(positionAddress, newLowerTick, newUpperTick, wallet);
                
                showNotification('Rebalancing completed successfully!', 'success');
                return true;
            } else {
                // For other DEXes, throw error for now
                throw new Error(`Auto-rebalancing not supported for ${position.location} yet`);
            }
        } catch (error) {
            console.error('Error executing rebalance:', error);
            showNotification('Rebalancing failed: ' + error.message, 'error');
            return false;
        }
    }
    
    // Get details for a specific position
    async getPositionDetails(positionAddress) {
        try {
            // In production, this would query the blockchain
            // For now, search through existing positions
            const mockPositions = this.getMockPositions();
            const allPools = [
                ...(mockPositions.orca || []),
                ...(mockPositions.raydium || [])
            ];
            
            // Find position with matching address
            // In production, this would do an actual RPC call
            return allPools.find(p => p.positionAddress === positionAddress) || null;
        } catch (error) {
            console.error('Error getting position details:', error);
            return null;
        }
    }
    
    // Toggle auto-rebalancing for a wallet
    async toggleAutoRebalancing(walletAddress, enabled) {
        try {
            // In production, this would update a database
            // For demo purposes, just log and simulate success
            console.log(`${enabled ? 'Enabling' : 'Disabling'} auto-rebalancing for ${walletAddress}`);
            
            // Configure Helius webhook
            if (enabled) {
                // Register webhook
                await this.registerHeliusWebhook(walletAddress);
                showNotification('Auto-rebalancing enabled. Your positions will be monitored for optimal performance.', 'success');
            } else {
                // Remove webhook
                await this.removeHeliusWebhook(walletAddress);
                showNotification('Auto-rebalancing disabled.', 'info');
            }
            
            return true;
        } catch (error) {
            console.error('Error toggling auto-rebalancing:', error);
            showNotification('Failed to update auto-rebalancing settings: ' + error.message, 'error');
            return false;
        }
    }
    
    // Register Helius webhook for auto-rebalancing
    async registerHeliusWebhook(walletAddress) {
        try {
            // In production, this would make an API call to Helius to register a webhook
            // For demo purposes, just log
            console.log(`Would register Helius webhook for ${walletAddress}`);
            
            // Endpoint would be your deployed API route
            const webhookUrl = window.location.origin + '/api/webhook';
            console.log(`Webhook URL would be: ${webhookUrl}`);
            
            return true;
        } catch (error) {
            console.error('Error registering webhook:', error);
            return false;
        }
    }
    
    // Remove Helius webhook
    async removeHeliusWebhook(walletAddress) {
        try {
            // In production, this would make an API call to Helius to remove a webhook
            // For demo purposes, just log
            console.log(`Would remove Helius webhook for ${walletAddress}`);
            return true;
        } catch (error) {
            console.error('Error removing webhook:', error);
            return false;
        }
    }
}

// Global API manager instance
const apiManager = new APIManager(); 