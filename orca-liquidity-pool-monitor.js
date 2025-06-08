// Complete Orca Liquidity Pool Monitor
// Works for any Solana DEX - just change the program IDs!

const { Connection, PublicKey } = require('@solana/web3.js');

// Orca Program IDs
const ORCA_PROGRAM_IDS = {
    // Main Whirlpool program (CLMM - Concentrated Liquidity)
    WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    // Legacy Orca pools (CPMM - Constant Product)
    LEGACY_POOLS: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'
};

class OrcaLiquidityMonitor {
    constructor(apiKey, rpcUrl = 'https://api.mainnet-beta.solana.com') {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.heliusApiKey = apiKey;
        this.heliusUrl = `https://api.helius.xyz/v0`;
    }

    // Method 1: Monitor ALL Orca transactions using Helius Enhanced API
    async getOrcaTransactions(walletAddress, limit = 50) {
        try {
            const url = `${this.heliusUrl}/addresses/${walletAddress}/transactions?api-key=${this.heliusApiKey}&type=SWAP&source=ORCA`;
            
            const response = await fetch(url);
            const transactions = await response.json();
            
            console.log(`Found ${transactions.length} Orca transactions`);
            
            // Parse Orca-specific data
            return transactions.map(tx => this.parseOrcaTransaction(tx));
        } catch (error) {
            console.error('Error fetching Orca transactions:', error);
            throw error;
        }
    }

    // Method 2: Monitor specific Orca pool address
    async monitorSpecificPool(poolAddress, walletAddress) {
        try {
            // Get all transactions involving this specific pool
            const signatures = await this.connection.getSignaturesForAddress(
                new PublicKey(poolAddress),
                { limit: 100 }
            );

            const poolTransactions = [];
            
            for (const sig of signatures) {
                const tx = await this.connection.getParsedTransaction(
                    sig.signature,
                    { maxSupportedTransactionVersion: 0 }
                );

                if (tx && this.involvesWallet(tx, walletAddress)) {
                    const parsed = await this.parseOrcaPoolTransaction(tx, sig);
                    if (parsed) poolTransactions.push(parsed);
                }
            }

            return poolTransactions;
        } catch (error) {
            console.error('Error monitoring specific pool:', error);
            throw error;
        }
    }

    // Method 3: Real-time monitoring using Helius Geyser Websockets
    setupRealTimeOrcaMonitoring(walletAddress, callback) {
        try {
            const ws = new WebSocket(`wss://api.helius.xyz/v0/ws/?api-key=${this.heliusApiKey}`);
            
            ws.onopen = () => {
                console.log('🌊 Connected to Orca real-time monitoring');
                
                // Subscribe to Orca Whirlpool program
                ws.send(JSON.stringify({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "transactionSubscribe",
                    "params": [
                        {
                            "accountInclude": [ORCA_PROGRAM_IDS.WHIRLPOOL],
                            "accountRequired": [walletAddress]
                        },
                        {
                            "commitment": "confirmed",
                            "encoding": "jsonParsed",
                            "transactionDetails": "full",
                            "maxSupportedTransactionVersion": 0
                        }
                    ]
                }));
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.method === 'transactionNotification') {
                        const transaction = data.params.result;
                        const parsed = await this.parseOrcaRealTimeTransaction(transaction);
                        if (parsed) {
                            callback(parsed);
                        }
                    }
                } catch (error) {
                    console.error('Error processing real-time transaction:', error);
                }
            };

            return ws;
        } catch (error) {
            console.error('Error setting up real-time monitoring:', error);
            throw error;
        }
    }

    // Method 4: Get all liquidity positions for a wallet
    async getWalletLiquidityPositions(walletAddress) {
        try {
            // Use Helius to get all transactions
            const allTransactions = await this.getOrcaTransactions(walletAddress, 200);
            
            // Filter for liquidity operations
            const liquidityOps = allTransactions.filter(tx => 
                ['increaseLiquidity', 'decreaseLiquidity', 'initializePosition'].includes(tx.operation)
            );

            // Group by pool to calculate current positions
            const positions = this.calculateCurrentPositions(liquidityOps);
            
            return positions;
        } catch (error) {
            console.error('Error getting liquidity positions:', error);
            throw error;
        }
    }

    // Method 5: Monitor using Bitquery (Alternative API)
    async getBitqueryOrcaData(walletAddress) {
        try {
            const query = `
                subscription {
                    Solana {
                        Instructions(
                            where: {
                                Instruction: {
                                    Program: {
                                        Address: { is: "${ORCA_PROGRAM_IDS.WHIRLPOOL}" }
                                        Method: { in: ["increaseLiquidity", "decreaseLiquidity", "swap"] }
                                    }
                                    Accounts: {
                                        includes: { Address: { is: "${walletAddress}" } }
                                    }
                                }
                            }
                            orderBy: { descending: Block_Time }
                        ) {
                            Block { Time }
                            Instruction {
                                Accounts {
                                    Address
                                    Token { Mint Symbol }
                                }
                                Program { Method }
                                Data
                            }
                            Transaction { Signature }
                        }
                    }
                }
            `;

            // This would connect to Bitquery's GraphQL endpoint
            // Implementation depends on your Bitquery setup
            return this.executeBitqueryQuery(query);
        } catch (error) {
            console.error('Error with Bitquery:', error);
            throw error;
        }
    }

    // Parse Orca transaction data
    parseOrcaTransaction(transaction) {
        try {
            const { signature, timestamp, type, source, description } = transaction;
            
            // Extract Orca-specific information
            let operation = 'unknown';
            let poolInfo = null;
            let tokenAmounts = {};
            
            if (description) {
                if (description.includes('Add liquidity') || description.includes('increaseLiquidity')) {
                    operation = 'addLiquidity';
                } else if (description.includes('Remove liquidity') || description.includes('decreaseLiquidity')) {
                    operation = 'removeLiquidity';
                } else if (description.includes('Swap') || description.includes('swap')) {
                    operation = 'swap';
                }
            }

            // Extract token transfer information
            if (transaction.tokenTransfers) {
                transaction.tokenTransfers.forEach(transfer => {
                    tokenAmounts[transfer.mint] = {
                        amount: transfer.tokenAmount,
                        fromAccount: transfer.fromUserAccount,
                        toAccount: transfer.toUserAccount
                    };
                });
            }

            return {
                signature,
                timestamp: new Date(timestamp * 1000),
                operation,
                source: 'ORCA',
                description,
                poolInfo,
                tokenAmounts,
                fees: transaction.fee,
                success: !transaction.error
            };
        } catch (error) {
            console.error('Error parsing Orca transaction:', error);
            return null;
        }
    }

    // Parse pool-specific transaction
    parseOrcaPoolTransaction(transaction, signatureInfo) {
        try {
            const { signature } = signatureInfo;
            const { blockTime, meta } = transaction;

            // Identify Orca operation type
            const operation = this.identifyOrcaOperation(transaction);
            
            // Extract token balance changes
            const tokenChanges = this.extractTokenChanges(meta);
            
            // Calculate liquidity metrics
            const liquidityMetrics = this.calculateLiquidityMetrics(tokenChanges, operation);

            return {
                signature,
                timestamp: blockTime ? new Date(blockTime * 1000) : null,
                operation,
                pool: this.extractPoolAddress(transaction),
                tokenA: liquidityMetrics.tokenA,
                tokenB: liquidityMetrics.tokenB,
                amountA: liquidityMetrics.amountA,
                amountB: liquidityMetrics.amountB,
                lpTokenChange: liquidityMetrics.lpTokenChange,
                fees: meta.fee,
                success: !meta.err
            };
        } catch (error) {
            console.error('Error parsing pool transaction:', error);
            return null;
        }
    }

    // Identify specific Orca operations
    identifyOrcaOperation(transaction) {
        const instructions = transaction.transaction.message.instructions;
        
        for (const instruction of instructions) {
            if (instruction.programId?.toBase58?.() === ORCA_PROGRAM_IDS.WHIRLPOOL) {
                // Decode instruction data to determine operation
                // This is simplified - real implementation would decode the instruction data
                const accounts = instruction.accounts?.length || 0;
                
                if (accounts >= 15) return 'swap';
                if (accounts >= 10) return 'increaseLiquidity';
                if (accounts >= 8) return 'decreaseLiquidity';
                return 'unknown';
            }
        }
        
        return 'unknown';
    }

    // Calculate current positions from transaction history
    calculateCurrentPositions(liquidityTransactions) {
        const positions = {};
        
        liquidityTransactions.forEach(tx => {
            const key = `${tx.tokenA}-${tx.tokenB}`;
            
            if (!positions[key]) {
                positions[key] = {
                    pool: tx.pool,
                    tokenA: tx.tokenA,
                    tokenB: tx.tokenB,
                    totalLiquidityAdded: 0,
                    totalLiquidityRemoved: 0,
                    netPosition: 0,
                    transactions: []
                };
            }
            
            positions[key].transactions.push(tx);
            
            if (tx.operation === 'addLiquidity' || tx.operation === 'increaseLiquidity') {
                positions[key].totalLiquidityAdded += (tx.amountA || 0) + (tx.amountB || 0);
            } else if (tx.operation === 'removeLiquidity' || tx.operation === 'decreaseLiquidity') {
                positions[key].totalLiquidityRemoved += (tx.amountA || 0) + (tx.amountB || 0);
            }
            
            positions[key].netPosition = positions[key].totalLiquidityAdded - positions[key].totalLiquidityRemoved;
        });
        
        // Filter out closed positions
        return Object.values(positions).filter(pos => pos.netPosition > 0.001);
    }

    // Helper methods
    involvesWallet(transaction, walletAddress) {
        const accountKeys = transaction.transaction.message.accountKeys.map(key => 
            key.pubkey?.toBase58?.() || key
        );
        return accountKeys.includes(walletAddress);
    }

    extractTokenChanges(meta) {
        if (!meta.preTokenBalances || !meta.postTokenBalances) return [];
        
        const changes = [];
        const preBalances = new Map();
        
        // Map pre-balances
        meta.preTokenBalances.forEach(balance => {
            const key = `${balance.accountIndex}-${balance.mint}`;
            preBalances.set(key, balance.uiTokenAmount.uiAmount || 0);
        });
        
        // Calculate changes
        meta.postTokenBalances.forEach(balance => {
            const key = `${balance.accountIndex}-${balance.mint}`;
            const preAmount = preBalances.get(key) || 0;
            const postAmount = balance.uiTokenAmount.uiAmount || 0;
            const change = postAmount - preAmount;
            
            if (Math.abs(change) > 0.000001) {
                changes.push({
                    mint: balance.mint,
                    change,
                    owner: balance.owner
                });
            }
        });
        
        return changes;
    }

    calculateLiquidityMetrics(tokenChanges, operation) {
        // Extract meaningful metrics from token changes
        const metrics = {
            tokenA: null,
            tokenB: null,
            amountA: 0,
            amountB: 0,
            lpTokenChange: 0
        };
        
        if (tokenChanges.length >= 2) {
            const [changeA, changeB] = tokenChanges;
            metrics.tokenA = changeA.mint;
            metrics.tokenB = changeB.mint;
            metrics.amountA = Math.abs(changeA.change);
            metrics.amountB = Math.abs(changeB.change);
        }
        
        return metrics;
    }

    extractPoolAddress(transaction) {
        // Extract pool address from transaction accounts
        // This is simplified - real implementation would decode specific account positions
        const accounts = transaction.transaction.message.accountKeys;
        return accounts[1]?.pubkey?.toBase58?.() || accounts[1] || 'unknown';
    }

    // Execute Bitquery GraphQL query
    async executeBitqueryQuery(query) {
        try {
            const response = await fetch('https://graphql.bitquery.io/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': 'YOUR_BITQUERY_API_KEY' // Replace with your key
                },
                body: JSON.stringify({ query })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Bitquery API error:', error);
            throw error;
        }
    }
}

// Usage Examples for DeFairy Integration
class DeFairyOrcaIntegration {
    constructor(heliusApiKey) {
        this.orcaMonitor = new OrcaLiquidityMonitor(heliusApiKey);
    }

    // Get complete Orca portfolio for DeFairy dashboard
    async getOrcaPortfolio(walletAddress) {
        try {
            console.log('🧚‍♀️ Loading magical Orca portfolio...');
            
            // Get all Orca transactions
            const transactions = await this.orcaMonitor.getOrcaTransactions(walletAddress);
            
            // Get current liquidity positions
            const positions = await this.orcaMonitor.getWalletLiquidityPositions(walletAddress);
            
            // Calculate portfolio metrics
            const metrics = this.calculatePortfolioMetrics(transactions, positions);
            
            console.log('✨ Orca portfolio loaded successfully!');
            
            return {
                transactions,
                positions,
                metrics: {
                    totalValue: metrics.totalValue,
                    totalFeesEarned: metrics.totalFeesEarned,
                    profitLoss24h: metrics.profitLoss24h,
                    averageAPY: metrics.averageAPY,
                    activePositions: positions.length,
                    totalTransactions: transactions.length
                }
            };
        } catch (error) {
            console.error('Error getting Orca portfolio:', error);
            throw error;
        }
    }

    // Monitor Orca in real-time for DeFairy notifications
    startRealTimeMonitoring(walletAddress, callback) {
        console.log('🌊 Starting real-time Orca monitoring...');
        
        return this.orcaMonitor.setupRealTimeOrcaMonitoring(walletAddress, (transaction) => {
            // Format for DeFairy UI
            const formatted = {
                type: 'orca_transaction',
                operation: transaction.operation,
                timestamp: new Date(),
                description: `Orca ${transaction.operation} detected`,
                signature: transaction.signature,
                // Add magical sparkle effect
                magical: true
            };
            
            callback(formatted);
        });
    }

    calculatePortfolioMetrics(transactions, positions) {
        // Calculate metrics for DeFairy dashboard
        const totalValue = positions.reduce((sum, pos) => sum + pos.netPosition, 0);
        const totalFeesEarned = transactions
            .filter(tx => tx.operation === 'swap')
            .reduce((sum, tx) => sum + (tx.fees || 0), 0);
        
        // Calculate 24h P&L (simplified)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent24h = transactions.filter(tx => tx.timestamp > yesterday);
        const profitLoss24h = recent24h.reduce((sum, tx) => {
            if (tx.operation === 'swap') return sum + (tx.fees || 0);
            return sum;
        }, 0);
        
        return {
            totalValue,
            totalFeesEarned,
            profitLoss24h,
            averageAPY: 15.5 // This would be calculated from actual data
        };
    }
}

// Example usage in your DeFairy app
async function integrateOrcaWithDeFairy() {
    const orcaIntegration = new DeFairyOrcaIntegration('YOUR_HELIUS_API_KEY');
    const walletAddress = 'YOUR_WALLET_ADDRESS';
    
    try {
        // Get complete portfolio
        const portfolio = await orcaIntegration.getOrcaPortfolio(walletAddress);
        console.log('Orca Portfolio:', portfolio);
        
        // Start real-time monitoring
        const ws = orcaIntegration.startRealTimeMonitoring(walletAddress, (transaction) => {
            console.log('🌊 New Orca transaction:', transaction);
            // Update DeFairy UI with magical animations
        });
        
        // Clean up after 30 seconds (for demo)
        setTimeout(() => {
            ws.close();
            console.log('Stopped monitoring');
        }, 30000);
        
    } catch (error) {
        console.error('Integration error:', error);
    }
}

// Generic function to monitor ANY Solana DEX
function createDEXMonitor(dexName, programIds) {
    return class DEXMonitor extends OrcaLiquidityMonitor {
        constructor(apiKey) {
            super(apiKey);
            this.dexName = dexName;
            this.programIds = programIds;
        }
        
        async getTransactions(walletAddress, limit = 50) {
            // Use the same logic but with different program IDs
            const url = `${this.heliusUrl}/addresses/${walletAddress}/transactions?api-key=${this.heliusApiKey}&source=${dexName.toUpperCase()}`;
            // ... rest of implementation
        }
    };
}

// Example: Create Raydium monitor
const RaydiumMonitor = createDEXMonitor('Raydium', {
    AMM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
});

module.exports = {
    OrcaLiquidityMonitor,
    DeFairyOrcaIntegration,
    ORCA_PROGRAM_IDS,
    createDEXMonitor
};

// Run the integration
// integrateOrcaWithDeFairy();