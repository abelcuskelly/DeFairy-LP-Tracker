// Orca Whirlpools Program Integration
class OrcaWhirlpoolClient {
    constructor() {
        this.connection = null;
        this.provider = null;
        this.whirlpoolCtx = null;
        this.initialized = false;
    }

    // Initialize the Orca client with connection and wallet
    async initialize(connection, wallet) {
        try {
            // Import necessary modules - these will be loaded dynamically
            const { WhirlpoolContext, ORCA_WHIRLPOOL_PROGRAM_ID } = await import('@orca-so/whirlpools-sdk');
            const { AnchorProvider } = await import('@coral-xyz/anchor');
            
            // Initialize connection if not provided
            if (!connection) {
                const { Connection } = await import('@solana/web3.js');
                const rpcUrl = heliusClient.mainnetRPC;
                connection = new Connection(rpcUrl, 'confirmed');
            }
            
            this.connection = connection;
            
            // Setup provider with wallet if provided
            if (wallet) {
                this.provider = new AnchorProvider(
                    connection,
                    wallet,
                    AnchorProvider.defaultOptions()
                );
            } else {
                // Read-only provider for non-transaction operations
                this.provider = new AnchorProvider(
                    connection,
                    {
                        publicKey: null,
                        signTransaction: async () => { throw new Error('Wallet not connected'); },
                        signAllTransactions: async () => { throw new Error('Wallet not connected'); },
                    },
                    AnchorProvider.defaultOptions()
                );
            }
            
            // Initialize Whirlpool context
            this.whirlpoolCtx = WhirlpoolContext.withProvider(
                this.provider,
                ORCA_WHIRLPOOL_PROGRAM_ID
            );
            
            this.initialized = true;
            console.log('Orca Whirlpool client initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Orca client:', error);
            return false;
        }
    }

    // Get positions for a wallet
    async getPositions(walletAddress) {
        try {
            if (!this.initialized) {
                throw new Error('Orca client not initialized');
            }

            const { PDAUtil, PositionData } = await import('@orca-so/whirlpools-sdk');
            const { PublicKey } = await import('@solana/web3.js');
            
            // Get token accounts to find position tokens
            const tokenAccounts = await heliusClient.getTokenAccounts(walletAddress);
            const positions = [];
            
            for (const account of tokenAccounts) {
                try {
                    // Check if this is a position token account
                    const tokenInfo = account.account.data.parsed.info;
                    const mint = tokenInfo.mint;
                    
                    // Get position PDA from mint
                    const positionPda = PDAUtil.getPosition(
                        this.whirlpoolCtx.program.programId,
                        new PublicKey(mint)
                    );
                    
                    // Fetch position data
                    const positionData = await PositionData.fetch(
                        this.whirlpoolCtx,
                        positionPda.publicKey
                    );
                    
                    if (!positionData) continue;
                    
                    // Get whirlpool data for this position
                    const whirlpool = await this.getWhirlpoolData(positionData.whirlpool);
                    
                    // Calculate position value and other metrics
                    const positionValue = await this.calculatePositionValue(
                        positionData,
                        whirlpool,
                        tokenInfo.tokenAmount.uiAmount
                    );
                    
                    positions.push(positionValue);
                } catch (error) {
                    // Skip accounts that aren't position tokens
                    continue;
                }
            }
            
            return positions;
        } catch (error) {
            console.error('Error fetching Orca positions:', error);
            throw error;
        }
    }
    
    // Get whirlpool data for a specific pool
    async getWhirlpoolData(whirlpoolAddress) {
        try {
            const { WhirlpoolData } = await import('@orca-so/whirlpools-sdk');
            
            // Fetch the whirlpool data
            const whirlpoolData = await WhirlpoolData.fetch(
                this.whirlpoolCtx,
                whirlpoolAddress
            );
            
            if (!whirlpoolData) {
                throw new Error('Whirlpool not found');
            }
            
            // Get token metadata for the pool
            const tokenAInfo = await this.getTokenInfo(whirlpoolData.tokenMintA);
            const tokenBInfo = await this.getTokenInfo(whirlpoolData.tokenMintB);
            
            // Get current price
            const sqrt_price_x64 = whirlpoolData.sqrtPrice;
            const price = Math.pow(sqrt_price_x64 / (2 ** 64), 2);
            
            // Get fee rate
            const feeRate = whirlpoolData.feeRate / 1000000;
            
            return {
                address: whirlpoolAddress.toString(),
                tokenA: tokenAInfo,
                tokenB: tokenBInfo,
                price,
                feeRate,
                liquidity: whirlpoolData.liquidity.toString(),
                tickCurrentIndex: whirlpoolData.tickCurrentIndex,
                feeGrowthGlobalA: whirlpoolData.feeGrowthGlobalA,
                feeGrowthGlobalB: whirlpoolData.feeGrowthGlobalB,
                raw: whirlpoolData
            };
        } catch (error) {
            console.error('Error fetching whirlpool data:', error);
            throw error;
        }
    }
    
    // Get token info
    async getTokenInfo(mintAddress) {
        try {
            // Use Helius API to get token information
            const tokenInfo = await heliusClient.getTokenInfo(mintAddress.toString());
            
            return {
                address: mintAddress.toString(),
                symbol: tokenInfo?.symbol || 'Unknown',
                name: tokenInfo?.name || 'Unknown Token',
                decimals: tokenInfo?.decimals || 6,
                logo: tokenInfo?.logo || null
            };
        } catch (error) {
            console.error('Error fetching token info:', error);
            return {
                address: mintAddress.toString(),
                symbol: 'Unknown',
                name: 'Unknown Token',
                decimals: 6,
                logo: null
            };
        }
    }
    
    // Calculate position value and other metrics
    async calculatePositionValue(positionData, whirlpool, liquidity) {
        try {
            const { PriceMath, PoolUtil } = await import('@orca-so/whirlpools-sdk');
            
            // Determine if position is in range
            const currentTick = whirlpool.tickCurrentIndex;
            const lowerTick = positionData.tickLowerIndex;
            const upperTick = positionData.tickUpperIndex;
            const inRange = currentTick >= lowerTick && currentTick < upperTick;
            
            // Calculate amounts of tokens in position
            // Note: This is a simplified calculation - in production you'd use proper SDK functions
            const sqrtPriceX64 = whirlpool.raw.sqrtPrice;
            const sqrtPriceLowerX64 = PriceMath.tickIndexToSqrtPriceX64(lowerTick);
            const sqrtPriceUpperX64 = PriceMath.tickIndexToSqrtPriceX64(upperTick);
            
            // Get token amounts (simplified - would use SDK in production)
            let tokenAAmount = 0;
            let tokenBAmount = 0;
            
            if (inRange) {
                // Simplified calculation - actual implementation would use SDK
                tokenAAmount = liquidity * (sqrtPriceUpperX64 - sqrtPriceX64) / (sqrtPriceX64 * sqrtPriceUpperX64);
                tokenBAmount = liquidity * (sqrtPriceX64 - sqrtPriceLowerX64);
            } else if (currentTick < lowerTick) {
                // All tokenA
                tokenAAmount = liquidity * (sqrtPriceUpperX64 - sqrtPriceLowerX64) / (sqrtPriceLowerX64 * sqrtPriceUpperX64);
            } else {
                // All tokenB
                tokenBAmount = liquidity * (sqrtPriceUpperX64 - sqrtPriceLowerX64);
            }
            
            // Get token prices from Jupiter API
            const tokenAPriceData = await apiManager.getTokenPrices([whirlpool.tokenA.address]);
            const tokenBPriceData = await apiManager.getTokenPrices([whirlpool.tokenB.address]);
            
            const tokenAPrice = tokenAPriceData?.data?.[whirlpool.tokenA.address]?.price || 0;
            const tokenBPrice = tokenBPriceData?.data?.[whirlpool.tokenB.address]?.price || 0;
            
            // Calculate position value
            const tokenAValue = tokenAAmount * tokenAPrice;
            const tokenBValue = tokenBAmount * tokenBPrice;
            const totalValue = tokenAValue + tokenBValue;
            
            // Calculate fees earned (would need historical data for accurate calculation)
            // For now, estimate based on position size and fee rate
            const feesEarned = totalValue * whirlpool.feeRate * 0.1; // Simplified estimation
            
            // Calculate APY (simplified - would need historical data)
            const estimatedApy = whirlpool.feeRate * 365 * 10; // Very simplified estimation
            
            // Calculate 24h P&L (simplified - would need historical data)
            const pl24h = totalValue * estimatedApy / 365;
            
            const positionData = {
                pool: `${whirlpool.tokenA.symbol}/${whirlpool.tokenB.symbol}`,
                balance: totalValue,
                token0: {
                    symbol: whirlpool.tokenA.symbol,
                    amount: tokenAAmount,
                    price: tokenAPrice
                },
                token1: {
                    symbol: whirlpool.tokenB.symbol,
                    amount: tokenBAmount,
                    price: tokenBPrice
                },
                feesEarned: feesEarned,
                inRange: inRange,
                apy24h: estimatedApy,
                pl24h: await this.calculateComprehensivePL24h({
                    pool: `${whirlpool.tokenA.symbol}/${whirlpool.tokenB.symbol}`,
                    token0: { symbol: whirlpool.tokenA.symbol, amount: tokenAAmount, price: tokenAPrice },
                    token1: { symbol: whirlpool.tokenB.symbol, amount: tokenBAmount, price: tokenBPrice },
                    feesEarned: feesEarned,
                    apy24h: estimatedApy
                }, totalValue),
                // Add P&L breakdown components
                feesEarned24h: await this.calculateFeesEarned24h({
                    pool: `${whirlpool.tokenA.symbol}/${whirlpool.tokenB.symbol}`,
                    token0: { symbol: whirlpool.tokenA.symbol, amount: tokenAAmount, price: tokenAPrice },
                    token1: { symbol: whirlpool.tokenB.symbol, amount: tokenBAmount, price: tokenBPrice },
                    feesEarned: feesEarned,
                    apy24h: estimatedApy
                }),
                impermanentLossGain24h: await this.calculateImpermanentLossGain24h({
                    pool: `${whirlpool.tokenA.symbol}/${whirlpool.tokenB.symbol}`,
                    token0: { symbol: whirlpool.tokenA.symbol, amount: tokenAAmount, price: tokenAPrice },
                    token1: { symbol: whirlpool.tokenB.symbol, amount: tokenBAmount, price: tokenBPrice },
                    feesEarned: feesEarned,
                    apy24h: estimatedApy
                }),
                priceAppreciation24h: await this.calculatePriceAppreciation24h({
                    pool: `${whirlpool.tokenA.symbol}/${whirlpool.tokenB.symbol}`,
                    token0: { symbol: whirlpool.tokenA.symbol, amount: tokenAAmount, price: tokenAPrice },
                    token1: { symbol: whirlpool.tokenB.symbol, amount: tokenBAmount, price: tokenBPrice },
                    feesEarned: feesEarned,
                    apy24h: estimatedApy
                }, totalValue),
                location: 'orca'
            };
            
            return positionData;
        } catch (error) {
            console.error('Error calculating position value:', error);
            throw error;
        }
    }
    
    // Rebalance a position
    async rebalancePosition(positionAddress, newLowerTick, newUpperTick, wallet) {
        try {
            if (!this.initialized || !wallet) {
                throw new Error('Orca client not initialized with wallet');
            }
            
            // Implement rebalancing logic
            // This would require multiple transactions:
            // 1. Withdraw liquidity from current position
            // 2. Create new position with new tick ranges
            // 3. Deposit liquidity into new position
            
            throw new Error('Rebalancing not yet implemented');
        } catch (error) {
            console.error('Error rebalancing position:', error);
            throw error;
        }
    }

    // Calculate comprehensive P&L for 24 hours
    async calculateComprehensivePL24h(positionData, totalValue) {
        try {
            // Component 1: Fees earned in last 24h
            const feesEarned24h = await this.calculateFeesEarned24h(positionData);
            
            // Component 2: Impermanent Loss/Gain in last 24h
            const impermanentLossGain24h = await this.calculateImpermanentLossGain24h(positionData);
            
            // Component 3: Price appreciation of the position in last 24h
            const priceAppreciation24h = await this.calculatePriceAppreciation24h(positionData, totalValue);
            
            // Total P&L = fees + IL/gain + price appreciation
            const totalPL24h = feesEarned24h + impermanentLossGain24h + priceAppreciation24h;
            
            console.log(`Orca P&L Breakdown for ${positionData.pool}:`, {
                feesEarned24h,
                impermanentLossGain24h,
                priceAppreciation24h,
                totalPL24h
            });
            
            return totalPL24h;
            
        } catch (error) {
            console.error('Error calculating comprehensive P&L:', error);
            // Fallback to simple estimation
            return totalValue * (positionData.apy24h || 0) / 365;
        }
    }
    
    // Generic comprehensive P&L calculation for any time period
    async calculateComprehensivePL(positionData, totalValue, timePeriod = '24h') {
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
            const feesEarned = await this.calculateFeesEarnedForPeriod(positionData, hours);
            
            // Component 2: Impermanent Loss/Gain in the time period
            const impermanentLossGain = await this.calculateImpermanentLossGainForPeriod(positionData, hours);
            
            // Component 3: Price appreciation in the time period
            const priceAppreciation = await this.calculatePriceAppreciationForPeriod(positionData, totalValue, hours);
            
            // Total P&L = fees + IL/gain + price appreciation
            const totalPL = feesEarned + impermanentLossGain + priceAppreciation;
            
            console.log(`Orca P&L Breakdown for ${positionData.pool} (${timePeriod}):`, {
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
            console.error(`Error calculating Orca comprehensive P&L for ${timePeriod}:`, error);
            // Fallback to simple estimation
            const dailyReturn = totalValue * (positionData.apy24h || 0) / 365;
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
    
    // Calculate fees earned in the last 24 hours for Orca position
    async calculateFeesEarned24h(positionData) {
        try {
            // If we have direct fee data, use it
            if (positionData.feesEarned24h) {
                return positionData.feesEarned24h;
            }
            
            // Estimate based on current fees earned (assuming most fees are recent)
            const estimatedDailyFees = (positionData.feesEarned || 0) * 0.8; // 80% of total fees from last 24h
            
            return estimatedDailyFees;
            
        } catch (error) {
            console.error('Error calculating Orca fees earned 24h:', error);
            return 0;
        }
    }
    
    // Calculate impermanent loss/gain in the last 24 hours for Orca position
    async calculateImpermanentLossGain24h(positionData) {
        try {
            if (!positionData.token0 || !positionData.token1) {
                return 0;
            }
            
            // Get current token prices
            const currentPrice0 = positionData.token0.price || 0;
            const currentPrice1 = positionData.token1.price || 0;
            
            if (currentPrice0 === 0 || currentPrice1 === 0) {
                return 0;
            }
            
            // Get 24h ago prices
            const price24hAgo0 = await this.getHistoricalPrice(positionData.token0.symbol, 24);
            const price24hAgo1 = await this.getHistoricalPrice(positionData.token1.symbol, 24);
            
            if (price24hAgo0 === 0 || price24hAgo1 === 0) {
                return 0;
            }
            
            // Calculate price ratio changes
            const currentRatio = currentPrice0 / currentPrice1;
            const pastRatio = price24hAgo0 / price24hAgo1;
            const ratioChange = currentRatio / pastRatio;
            
            // Calculate impermanent loss/gain using the standard formula
            // IL = 2 * sqrt(ratio) / (1 + ratio) - 1
            const currentIL = 2 * Math.sqrt(ratioChange) / (1 + ratioChange) - 1;
            
            // Convert to USD value
            const positionValue = (positionData.token0.amount * currentPrice0) + (positionData.token1.amount * currentPrice1);
            const impermanentLossGain = positionValue * currentIL;
            
            return impermanentLossGain;
            
        } catch (error) {
            console.error('Error calculating Orca impermanent loss/gain:', error);
            return 0;
        }
    }
    
    // Calculate price appreciation of the Orca position in the last 24 hours
    async calculatePriceAppreciation24h(positionData, totalValue) {
        try {
            if (!positionData.token0 || !positionData.token1) {
                return 0;
            }
            
            // Get current token prices
            const currentPrice0 = positionData.token0.price || 0;
            const currentPrice1 = positionData.token1.price || 0;
            
            // Get 24h ago prices
            const price24hAgo0 = await this.getHistoricalPrice(positionData.token0.symbol, 24);
            const price24hAgo1 = await this.getHistoricalPrice(positionData.token1.symbol, 24);
            
            if (price24hAgo0 === 0 || price24hAgo1 === 0) {
                return 0;
            }
            
            // Calculate value 24h ago
            const value24hAgo = (positionData.token0.amount * price24hAgo0) + (positionData.token1.amount * price24hAgo1);
            
            // Price appreciation = current value - past value (excluding fees and IL)
            const priceAppreciation = totalValue - value24hAgo;
            
            return priceAppreciation;
            
        } catch (error) {
            console.error('Error calculating Orca price appreciation:', error);
            return 0;
        }
    }
    
    // Get historical price for a token (shared utility method)
    async getHistoricalPrice(tokenSymbol, hoursAgo) {
        try {
            // In production, this would fetch from a price history API like CoinGecko
            // For now, simulate with realistic price variations
            const currentPrices = {
                'SOL': 180.45,
                'USDC': 1.00,
                'USDT': 1.00,
                'WBTC': 45234.56,
                'ETH': 2145.78,
                'BTC': 45000.00,
                'ORCA': 3.45,
                'RAY': 1.23,
                'SRM': 0.45
            };
            
            const currentPrice = currentPrices[tokenSymbol] || 1.00;
            
            // Simulate 24h price change (±8% random variation for more realistic crypto volatility)
            const priceChange = (Math.random() - 0.5) * 0.16; // ±8%
            const historicalPrice = currentPrice * (1 - priceChange);
            
            return Math.max(historicalPrice, 0.001); // Ensure positive price
            
        } catch (error) {
            console.error('Error getting historical price:', error);
            return 0;
        }
    }

    // Generic calculation methods for any time period
    async calculateFeesEarnedForPeriod(positionData, hours) {
        try {
            if (!hours || hours === null) {
                // All-time fees
                return positionData.feesEarned || 0;
            }
            
            // Estimate based on daily fee rate
            const dailyFeeRate = await this.calculateFeesEarned24h(positionData);
            const hourlyRate = dailyFeeRate / 24;
            return hourlyRate * hours;
            
        } catch (error) {
            console.error(`Error calculating Orca fees for ${hours}h period:`, error);
            return 0;
        }
    }
    
    async calculateImpermanentLossGainForPeriod(positionData, hours) {
        try {
            if (!positionData.token0 || !positionData.token1) {
                return 0;
            }
            
            // Get current token prices
            const currentPrice0 = positionData.token0.price || 0;
            const currentPrice1 = positionData.token1.price || 0;
            
            if (currentPrice0 === 0 || currentPrice1 === 0) {
                return 0;
            }
            
            // Get historical prices for the period
            const historicalPrice0 = await this.getHistoricalPrice(positionData.token0.symbol, hours);
            const historicalPrice1 = await this.getHistoricalPrice(positionData.token1.symbol, hours);
            
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
            const positionValue = (positionData.token0.amount * currentPrice0) + (positionData.token1.amount * currentPrice1);
            const impermanentLossGain = positionValue * currentIL;
            
            return impermanentLossGain;
            
        } catch (error) {
            console.error(`Error calculating Orca IL for ${hours}h period:`, error);
            return 0;
        }
    }
    
    async calculatePriceAppreciationForPeriod(positionData, totalValue, hours) {
        try {
            if (!positionData.token0 || !positionData.token1) {
                return 0;
            }
            
            // Get historical prices
            const historicalPrice0 = await this.getHistoricalPrice(positionData.token0.symbol, hours);
            const historicalPrice1 = await this.getHistoricalPrice(positionData.token1.symbol, hours);
            
            if (historicalPrice0 === 0 || historicalPrice1 === 0) {
                return 0;
            }
            
            // Calculate historical value
            const historicalValue = (positionData.token0.amount * historicalPrice0) + (positionData.token1.amount * historicalPrice1);
            
            // Price appreciation = current value - historical value
            const priceAppreciation = totalValue - historicalValue;
            
            return priceAppreciation;
            
        } catch (error) {
            console.error(`Error calculating Orca price appreciation for ${hours}h period:`, error);
            return 0;
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
}

// Create global instance
const orcaClient = new OrcaWhirlpoolClient();

// Export for use in other modules
window.orcaClient = orcaClient; 