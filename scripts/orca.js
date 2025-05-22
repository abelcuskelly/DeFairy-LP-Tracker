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
            
            return {
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
                feesEarned,
                inRange,
                apy24h: estimatedApy,
                pl24h,
                location: 'Orca',
                positionAddress: positionData.publicKey.toString(),
                whirlpoolAddress: whirlpool.address,
                lowerTick,
                upperTick,
                currentTick
            };
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
}

// Create global instance
const orcaClient = new OrcaWhirlpoolClient();

// Export for use in other modules
window.orcaClient = orcaClient; 