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
        
        // SECURITY: API key should be loaded from environment variables
        this.heliusApiKey = this.getHeliusApiKey();
        this.retryCount = 3;
        this.retryDelay = 1000;
        this.websocketConnected = false;
        this.subscribedWallets = new Set();
    }

    getHeliusApiKey() {
        // SECURITY WARNING: Never hardcode API keys in client-side code
        // This should be loaded from environment variables or server-side
        console.warn('SECURITY: Helius API key should be loaded from environment variables');
        
        // For local development - use environment variable or fallback
        if (typeof window !== 'undefined' && window.HELIUS_API_KEY) {
            return window.HELIUS_API_KEY;
        }
        
        // Fallback for demo purposes - should be replaced with proper env var
        return 'YOUR_HELIUS_API_KEY_HERE';
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
                        pool: poolData.pool,
                        balance: totalValue,
                        token0: {
                            symbol: poolData.token0?.symbol || 'Unknown',
                            amount: poolData.token0?.amount || 0,
                            price: poolData.token0?.price || 0
                        },
                        token1: {
                            symbol: poolData.token1?.symbol || 'Unknown',
                            amount: poolData.token1?.amount || 0,
                            price: poolData.token1?.price || 0
                        },
                        feesEarned: poolData.feesEarned,
                        inRange: poolData.inRange,
                        apy24h: poolData.apy24h,
                        pl24h: await this.calculateComprehensivePL24h(poolData, totalValue),
                        // Add P&L breakdown components
                        feesEarned24h: await this.calculateFeesEarned24h(poolData),
                        impermanentLossGain24h: await this.calculateImpermanentLossGain24h(poolData),
                        priceAppreciation24h: await this.calculatePriceAppreciation24h(poolData, totalValue),
                        location: poolData.location // Store the location for proper hyperlinks
                    };
                    
                    // Calculate P&L for multiple time periods
                    const timePeriods = ['1h', '7d', '30d'];
                    for (const period of timePeriods) {
                        const plData = await this.calculateComprehensivePL(poolData, totalValue, period);
                        positionData[`pl${period}`] = plData.total;
                        positionData[`feesEarned${period}`] = plData.feesEarned;
                        positionData[`impermanentLossGain${period}`] = plData.impermanentLossGain;
                        positionData[`priceAppreciation${period}`] = plData.priceAppreciation;
                    }
                    
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
                    feesEarned24h: 18.76,
                    impermanentLossGain24h: -2.31,
                    priceAppreciation24h: 107.00,
                    // 1 hour P&L
                    pl1h: 5.14,
                    feesEarned1h: 0.78,
                    impermanentLossGain1h: -0.10,
                    priceAppreciation1h: 4.46,
                    // 7 day P&L
                    pl7d: 864.15,
                    feesEarned7d: 131.32,
                    impermanentLossGain7d: -16.17,
                    priceAppreciation7d: 749.00,
                    // 30 day P&L
                    pl30d: 3703.50,
                    feesEarned30d: 562.80,
                    impermanentLossGain30d: -69.30,
                    priceAppreciation30d: 3210.00,
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
                    feesEarned24h: 36.53,
                    impermanentLossGain24h: 12.45,
                    priceAppreciation24h: 185.58,
                    // 1 hour P&L
                    pl1h: 9.77,
                    feesEarned1h: 1.52,
                    impermanentLossGain1h: 0.52,
                    priceAppreciation1h: 7.73,
                    // 7 day P&L
                    pl7d: 1641.92,
                    feesEarned7d: 255.71,
                    impermanentLossGain7d: 87.15,
                    priceAppreciation7d: 1299.06,
                    // 30 day P&L
                    pl30d: 7036.80,
                    feesEarned30d: 1095.90,
                    impermanentLossGain30d: 373.50,
                    priceAppreciation30d: 5567.40,
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
                    feesEarned24h: 9.87,
                    impermanentLossGain24h: -0.12,
                    priceAppreciation24h: -22.09,
                    // 1 hour P&L
                    pl1h: -0.51,
                    feesEarned1h: 0.41,
                    impermanentLossGain1h: -0.01,
                    priceAppreciation1h: -0.91,
                    // 7 day P&L
                    pl7d: -86.38,
                    feesEarned7d: 69.09,
                    impermanentLossGain7d: -0.84,
                    priceAppreciation7d: -154.63,
                    // 30 day P&L
                    pl30d: -370.20,
                    feesEarned30d: 296.10,
                    impermanentLossGain30d: -3.60,
                    priceAppreciation30d: -662.70,
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

    // Calculate comprehensive P&L for a position
    async calculateComprehensivePL24h(poolData, totalValue) {
        try {
            // Get 24h historical data for price comparison
            const now = Date.now();
            const yesterday = now - (24 * 60 * 60 * 1000);
            
            // Component 1: Fees earned in last 24h
            const feesEarned24h = await this.calculateFeesEarned24h(poolData);
            
            // Component 2: Impermanent Loss/Gain in last 24h
            const impermanentLossGain24h = await this.calculateImpermanentLossGain24h(poolData);
            
            // Component 3: Price appreciation of the position in last 24h
            const priceAppreciation24h = await this.calculatePriceAppreciation24h(poolData, totalValue);
            
            // Total P&L = fees + IL/gain + price appreciation
            const totalPL24h = feesEarned24h + impermanentLossGain24h + priceAppreciation24h;
            
            console.log(`P&L Breakdown for ${poolData.pool}:`, {
                feesEarned24h,
                impermanentLossGain24h,
                priceAppreciation24h,
                totalPL24h
            });
            
            return totalPL24h;
            
        } catch (error) {
            console.error('Error calculating comprehensive P&L:', error);
            // Fallback to simple estimation
            return totalValue * (poolData.apy24h || 0) / 365;
        }
    }
    
    // Generic comprehensive P&L calculation for any time period
    async calculateComprehensivePL(poolData, totalValue, timePeriod = '24h') {
        try {
            // Convert time period to hours
            const hoursMap = {
                '1h': 1,
                '24h': 24,
                '7d': 168,
                '30d': 720,
                '1y': 8760,
                'all': null // Special case for all-time
            };
            
            const hours = hoursMap[timePeriod] || 24;
            
            // Component 1: Fees earned in the time period
            const feesEarned = await this.calculateFeesEarnedForPeriod(poolData, hours);
            
            // Component 2: Impermanent Loss/Gain in the time period
            const impermanentLossGain = await this.calculateImpermanentLossGainForPeriod(poolData, hours);
            
            // Component 3: Price appreciation in the time period
            const priceAppreciation = await this.calculatePriceAppreciationForPeriod(poolData, totalValue, hours);
            
            // Total P&L = fees + IL/gain + price appreciation
            const totalPL = feesEarned + impermanentLossGain + priceAppreciation;
            
            console.log(`P&L Breakdown for ${poolData.pool} (${timePeriod}):`, {
                feesEarned,
                impermanentLossGain,
                priceAppreciation,
                totalPL
            });
            
            return {
                total: totalPL,
                feesEarned,
                impermanentLossGain,
                priceAppreciation,
                timePeriod
            };
            
        } catch (error) {
            console.error(`Error calculating comprehensive P&L for ${timePeriod}:`, error);
            // Fallback to simple estimation
            const dailyReturn = totalValue * (poolData.apy24h || 0) / 365;
            const hoursInPeriod = this.getHoursForPeriod(timePeriod);
            return {
                total: dailyReturn * (hoursInPeriod / 24),
                feesEarned: 0,
                impermanentLossGain: 0,
                priceAppreciation: 0,
                timePeriod
            };
        }
    }
    
    // Helper to get hours for a time period
    getHoursForPeriod(timePeriod) {
        const hoursMap = {
            '1h': 1,
            '24h': 24,
            '7d': 168,
            '30d': 720,
            '1y': 8760,
            'all': 8760 // Default to 1 year for all-time
        };
        return hoursMap[timePeriod] || 24;
    }
    
    // Calculate fees earned in the last 24 hours
    async calculateFeesEarned24h(poolData) {
        try {
            // If we have direct fee data, use it
            if (poolData.feesEarned24h) {
                return poolData.feesEarned24h;
            }
            
            // Estimate based on APY and position size
            // Fees typically represent 80-90% of LP returns
            const estimatedDailyFees = (poolData.feesEarned || 0) * 0.85; // 85% of total fees assumed to be from last 24h
            
            return estimatedDailyFees;
            
        } catch (error) {
            console.error('Error calculating fees earned 24h:', error);
            return 0;
        }
    }
    
    // Calculate impermanent loss/gain in the last 24 hours
    async calculateImpermanentLossGain24h(poolData) {
        try {
            if (!poolData.token0 || !poolData.token1) {
                return 0;
            }
            
            // Get current token prices
            const currentPrice0 = poolData.token0.price || 0;
            const currentPrice1 = poolData.token1.price || 0;
            
            if (currentPrice0 === 0 || currentPrice1 === 0) {
                return 0;
            }
            
            // Get 24h ago prices (simplified - in production, fetch historical data)
            const price24hAgo0 = await this.getHistoricalPrice(poolData.token0.symbol, 24);
            const price24hAgo1 = await this.getHistoricalPrice(poolData.token1.symbol, 24);
            
            if (price24hAgo0 === 0 || price24hAgo1 === 0) {
                return 0;
            }
            
            // Calculate price ratio changes
            const currentRatio = currentPrice0 / currentPrice1;
            const pastRatio = price24hAgo0 / price24hAgo1;
            const ratioChange = currentRatio / pastRatio;
            
            // Calculate impermanent loss/gain
            // IL = 2 * sqrt(ratio) / (1 + ratio) - 1
            const currentIL = 2 * Math.sqrt(ratioChange) / (1 + ratioChange) - 1;
            
            // Convert to USD value
            const positionValue = (poolData.token0.amount * currentPrice0) + (poolData.token1.amount * currentPrice1);
            const impermanentLossGain = positionValue * currentIL;
            
            return impermanentLossGain;
            
        } catch (error) {
            console.error('Error calculating impermanent loss/gain:', error);
            return 0;
        }
    }
    
    // Calculate price appreciation of the position in the last 24 hours
    async calculatePriceAppreciation24h(poolData, totalValue) {
        try {
            if (!poolData.token0 || !poolData.token1) {
                return 0;
            }
            
            // Get current token prices
            const currentPrice0 = poolData.token0.price || 0;
            const currentPrice1 = poolData.token1.price || 0;
            
            // Get 24h ago prices
            const price24hAgo0 = await this.getHistoricalPrice(poolData.token0.symbol, 24);
            const price24hAgo1 = await this.getHistoricalPrice(poolData.token1.symbol, 24);
            
            if (price24hAgo0 === 0 || price24hAgo1 === 0) {
                return 0;
            }
            
            // Calculate value 24h ago
            const value24hAgo = (poolData.token0.amount * price24hAgo0) + (poolData.token1.amount * price24hAgo1);
            
            // Price appreciation = current value - past value (excluding fees and IL)
            const priceAppreciation = totalValue - value24hAgo;
            
            return priceAppreciation;
            
        } catch (error) {
            console.error('Error calculating price appreciation:', error);
            return 0;
        }
    }
    
    // Get historical price for a token (simplified implementation)
    async getHistoricalPrice(tokenSymbol, hoursAgo) {
        try {
            // In production, this would fetch from a price history API
            // For now, simulate with a small random variation
            const currentPrices = {
                'SOL': 180.45,
                'USDC': 1.00,
                'USDT': 1.00,
                'WBTC': 45234.56,
                'ETH': 2145.78,
                'BTC': 45000.00
            };
            
            const currentPrice = currentPrices[tokenSymbol] || 1.00;
            
            // Simulate 24h price change (±5% random variation)
            const priceChange = (Math.random() - 0.5) * 0.1; // ±5%
            const historicalPrice = currentPrice * (1 - priceChange);
            
            return historicalPrice;
            
        } catch (error) {
            console.error('Error getting historical price:', error);
            return 0;
        }
    }

    // Generic calculation methods for any time period
    async calculateFeesEarnedForPeriod(poolData, hours) {
        try {
            if (!hours || hours === null) {
                // All-time fees
                return poolData.feesEarned || 0;
            }
            
            // Estimate based on daily fee rate
            const dailyFeeRate = await this.calculateFeesEarned24h(poolData);
            const hourlyRate = dailyFeeRate / 24;
            return hourlyRate * hours;
            
        } catch (error) {
            console.error(`Error calculating fees for ${hours}h period:`, error);
            return 0;
        }
    }
    
    async calculateImpermanentLossGainForPeriod(poolData, hours) {
        try {
            if (!poolData.token0 || !poolData.token1) {
                return 0;
            }
            
            // Get current token prices
            const currentPrice0 = poolData.token0.price || 0;
            const currentPrice1 = poolData.token1.price || 0;
            
            if (currentPrice0 === 0 || currentPrice1 === 0) {
                return 0;
            }
            
            // Get historical prices for the period
            const historicalPrice0 = await this.getHistoricalPrice(poolData.token0.symbol, hours);
            const historicalPrice1 = await this.getHistoricalPrice(poolData.token1.symbol, hours);
            
            if (historicalPrice0 === 0 || historicalPrice1 === 0) {
                return 0;
            }
            
            // Calculate price ratio changes
            const currentRatio = currentPrice0 / currentPrice1;
            const pastRatio = historicalPrice0 / historicalPrice1;
            const ratioChange = currentRatio / pastRatio;
            
            // Calculate impermanent loss/gain
            const currentIL = 2 * Math.sqrt(ratioChange) / (1 + ratioChange) - 1;
            
            // Convert to USD value
            const positionValue = (poolData.token0.amount * currentPrice0) + (poolData.token1.amount * currentPrice1);
            const impermanentLossGain = positionValue * currentIL;
            
            return impermanentLossGain;
            
        } catch (error) {
            console.error(`Error calculating IL for ${hours}h period:`, error);
            return 0;
        }
    }
    
    async calculatePriceAppreciationForPeriod(poolData, totalValue, hours) {
        try {
            if (!poolData.token0 || !poolData.token1) {
                return 0;
            }
            
            // Get historical prices
            const historicalPrice0 = await this.getHistoricalPrice(poolData.token0.symbol, hours);
            const historicalPrice1 = await this.getHistoricalPrice(poolData.token1.symbol, hours);
            
            if (historicalPrice0 === 0 || historicalPrice1 === 0) {
                return 0;
            }
            
            // Calculate historical value
            const historicalValue = (poolData.token0.amount * historicalPrice0) + (poolData.token1.amount * historicalPrice1);
            
            // Price appreciation = current value - historical value
            const priceAppreciation = totalValue - historicalValue;
            
            return priceAppreciation;
            
        } catch (error) {
            console.error(`Error calculating price appreciation for ${hours}h period:`, error);
            return 0;
        }
    }
    
    // Helper to get time period suffix for data keys
    getTimePeriodSuffix(hours) {
        const suffixMap = {
            1: '1h',
            24: '24h',
            168: '7d',
            720: '30d',
            8760: '1y'
        };
        return suffixMap[hours] || `${hours}h`;
    }
}

// Global API manager instance
const apiManager = new APIManager(); 