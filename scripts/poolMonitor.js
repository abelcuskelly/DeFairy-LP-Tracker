// Comprehensive Solana Liquidity Pool Monitor
class SolanaPoolMonitor {
    constructor() {
        // Program IDs for different DEXes
        this.PROGRAM_IDS = {
            ORCA: {
                WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
                LEGACY_POOLS: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'
            },
            RAYDIUM: {
                AMM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
                CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
            },
            METEORA: {
                POOLS: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
            }
        };
        
        this.heliusApiKey = 'b9ca8559-01e8-4823-8fa2-c7b2b5b0755c';
        this.bitqueryApiKey = null; // Set this if you have a Bitquery API key
        this.websocketConnections = new Map();
    }

    // Method 1: Helius Enhanced API - Get all DEX transactions for a wallet
    async getOrcaTransactions(walletAddress, options = {}) {
        try {
            const { limit = 100, before = null } = options;
            
            showNotification('Fetching Orca transactions...', 'info');
            
            // Use Helius Enhanced API to get parsed transactions
            const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${this.heliusApiKey}`;
            const params = new URLSearchParams({
                limit: limit.toString(),
                type: 'SWAP,LIQUIDITY'
            });
            
            if (before) params.append('before', before);
            
            const response = await fetch(`${url}&${params}`);
            const transactions = await response.json();
            
            // Filter for Orca transactions
            const orcaTransactions = transactions.filter(tx => {
                const programIds = tx.accountData?.map(acc => acc.account) || [];
                return programIds.some(id => 
                    id === this.PROGRAM_IDS.ORCA.WHIRLPOOL || 
                    id === this.PROGRAM_IDS.ORCA.LEGACY_POOLS
                );
            });
            
            // Parse and enhance transaction data
            return orcaTransactions.map(tx => this.parseOrcaTransaction(tx));
        } catch (error) {
            console.error('Error fetching Orca transactions:', error);
            showNotification('Failed to fetch Orca transactions', 'error');
            throw error;
        }
    }

    // Parse Orca transaction for enhanced data
    parseOrcaTransaction(tx) {
        try {
            const enhanced = {
                signature: tx.signature,
                timestamp: tx.timestamp,
                slot: tx.slot,
                fee: tx.fee,
                status: tx.err ? 'failed' : 'success',
                type: this.determineTransactionType(tx),
                programId: this.getOrcaProgramId(tx),
                details: {}
            };
            
            // Extract operation-specific details
            if (tx.type === 'SWAP') {
                enhanced.details = this.parseSwapDetails(tx);
            } else if (tx.type === 'LIQUIDITY') {
                enhanced.details = this.parseLiquidityDetails(tx);
            }
            
            // Extract pool information
            enhanced.pool = this.extractPoolInfo(tx);
            
            // Extract fee information
            enhanced.fees = this.extractFeeInfo(tx);
            
            return enhanced;
        } catch (error) {
            console.error('Error parsing Orca transaction:', error);
            return tx; // Return original if parsing fails
        }
    }

    // Determine transaction type
    determineTransactionType(tx) {
        const instructions = tx.instructions || [];
        
        for (const instruction of instructions) {
            const programId = instruction.programId;
            const data = instruction.data;
            
            // Check for Orca Whirlpool instructions
            if (programId === this.PROGRAM_IDS.ORCA.WHIRLPOOL) {
                if (data?.includes('increaseLiquidity')) return 'INCREASE_LIQUIDITY';
                if (data?.includes('decreaseLiquidity')) return 'DECREASE_LIQUIDITY';
                if (data?.includes('swap')) return 'SWAP';
                if (data?.includes('initializePool')) return 'INITIALIZE_POOL';
                if (data?.includes('collectFees')) return 'COLLECT_FEES';
            }
        }
        
        return 'UNKNOWN';
    }

    // Get Orca program ID from transaction
    getOrcaProgramId(tx) {
        const programIds = tx.accountData?.map(acc => acc.account) || [];
        
        if (programIds.includes(this.PROGRAM_IDS.ORCA.WHIRLPOOL)) {
            return this.PROGRAM_IDS.ORCA.WHIRLPOOL;
        }
        if (programIds.includes(this.PROGRAM_IDS.ORCA.LEGACY_POOLS)) {
            return this.PROGRAM_IDS.ORCA.LEGACY_POOLS;
        }
        
        return null;
    }

    // Parse swap details
    parseSwapDetails(tx) {
        try {
            const tokenBalances = tx.tokenBalances || [];
            const preBalances = tokenBalances.filter(b => b.type === 'pre');
            const postBalances = tokenBalances.filter(b => b.type === 'post');
            
            // Calculate swap amounts
            const swapIn = {};
            const swapOut = {};
            
            for (const pre of preBalances) {
                const post = postBalances.find(p => p.mint === pre.mint && p.owner === pre.owner);
                if (post) {
                    const diff = post.uiTokenAmount.uiAmount - pre.uiTokenAmount.uiAmount;
                    if (diff < 0) {
                        swapIn[pre.mint] = {
                            amount: Math.abs(diff),
                            symbol: pre.uiTokenAmount.symbol || 'Unknown',
                            decimals: pre.uiTokenAmount.decimals
                        };
                    } else if (diff > 0) {
                        swapOut[pre.mint] = {
                            amount: diff,
                            symbol: pre.uiTokenAmount.symbol || 'Unknown',
                            decimals: pre.uiTokenAmount.decimals
                        };
                    }
                }
            }
            
            return {
                swapIn,
                swapOut,
                priceImpact: this.calculatePriceImpact(swapIn, swapOut)
            };
        } catch (error) {
            console.error('Error parsing swap details:', error);
            return {};
        }
    }

    // Parse liquidity details
    parseLiquidityDetails(tx) {
        try {
            const details = {
                operation: this.determineTransactionType(tx),
                tokens: {},
                lpTokenChange: 0
            };
            
            // Extract token changes
            const tokenBalances = tx.tokenBalances || [];
            const preBalances = tokenBalances.filter(b => b.type === 'pre');
            const postBalances = tokenBalances.filter(b => b.type === 'post');
            
            for (const pre of preBalances) {
                const post = postBalances.find(p => p.mint === pre.mint && p.owner === pre.owner);
                if (post) {
                    const diff = post.uiTokenAmount.uiAmount - pre.uiTokenAmount.uiAmount;
                    if (diff !== 0) {
                        details.tokens[pre.mint] = {
                            change: diff,
                            symbol: pre.uiTokenAmount.symbol || 'Unknown',
                            decimals: pre.uiTokenAmount.decimals
                        };
                    }
                }
            }
            
            return details;
        } catch (error) {
            console.error('Error parsing liquidity details:', error);
            return {};
        }
    }

    // Extract pool information
    extractPoolInfo(tx) {
        try {
            // Look for pool account in transaction
            const accounts = tx.accountData || [];
            const poolAccount = accounts.find(acc => 
                acc.account && (
                    acc.account.includes('pool') || 
                    acc.account.includes('whirlpool')
                )
            );
            
            if (poolAccount) {
                return {
                    address: poolAccount.account,
                    tokens: this.extractPoolTokens(tx)
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting pool info:', error);
            return null;
        }
    }

    // Extract pool tokens
    extractPoolTokens(tx) {
        const tokens = [];
        const tokenBalances = tx.tokenBalances || [];
        
        // Get unique token mints
        const mints = [...new Set(tokenBalances.map(b => b.mint))];
        
        for (const mint of mints) {
            const tokenBalance = tokenBalances.find(b => b.mint === mint);
            if (tokenBalance) {
                tokens.push({
                    mint,
                    symbol: tokenBalance.uiTokenAmount.symbol || 'Unknown',
                    decimals: tokenBalance.uiTokenAmount.decimals
                });
            }
        }
        
        return tokens;
    }

    // Extract fee information
    extractFeeInfo(tx) {
        try {
            const fees = {
                transaction: tx.fee || 0,
                trading: 0,
                protocol: 0
            };
            
            // Look for fee collection instructions
            const instructions = tx.instructions || [];
            for (const instruction of instructions) {
                if (instruction.data?.includes('collectFees')) {
                    // Parse fee amounts from instruction data
                    // This would require decoding the instruction data
                }
            }
            
            return fees;
        } catch (error) {
            console.error('Error extracting fee info:', error);
            return { transaction: tx.fee || 0 };
        }
    }

    // Calculate price impact
    calculatePriceImpact(swapIn, swapOut) {
        // Simplified price impact calculation
        // In production, you'd use pool reserves and proper AMM math
        return 0; // Placeholder
    }

    // Method 2: Monitor specific pool
    async monitorSpecificPool(poolAddress, walletAddress = null) {
        try {
            showNotification(`Monitoring pool ${poolAddress}...`, 'info');
            
            // Get pool transactions
            const url = `https://api.helius.xyz/v0/addresses/${poolAddress}/transactions?api-key=${this.heliusApiKey}`;
            const response = await fetch(url);
            const transactions = await response.json();
            
            // Filter by wallet if provided
            let poolTransactions = transactions;
            if (walletAddress) {
                poolTransactions = transactions.filter(tx => 
                    tx.accountData?.some(acc => acc.owner === walletAddress)
                );
            }
            
            // Parse transactions
            return poolTransactions.map(tx => this.parseOrcaTransaction(tx));
        } catch (error) {
            console.error('Error monitoring specific pool:', error);
            throw error;
        }
    }

    // Method 3: Real-time WebSocket monitoring
    setupRealTimeOrcaMonitoring(walletAddress, callback) {
        try {
            const ws = new WebSocket(`wss://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`);
            
            ws.onopen = () => {
                console.log('WebSocket connected for real-time monitoring');
                
                // Subscribe to account changes
                ws.send(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'accountSubscribe',
                    params: [
                        walletAddress,
                        {
                            encoding: 'jsonParsed',
                            commitment: 'confirmed'
                        }
                    ]
                }));
                
                // Subscribe to program logs for Orca programs
                ws.send(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'logsSubscribe',
                    params: [
                        {
                            mentions: [this.PROGRAM_IDS.ORCA.WHIRLPOOL]
                        },
                        {
                            commitment: 'confirmed'
                        }
                    ]
                }));
            };
            
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                
                if (data.method === 'accountNotification') {
                    // Handle account updates
                    const accountInfo = data.params.result;
                    callback({
                        type: 'account_update',
                        data: accountInfo
                    });
                } else if (data.method === 'logsNotification') {
                    // Handle program logs
                    const logs = data.params.result;
                    const parsedTransaction = await this.parseRealtimeTransaction(logs);
                    callback({
                        type: 'new_transaction',
                        data: parsedTransaction
                    });
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
            };
            
            // Store connection
            this.websocketConnections.set(walletAddress, ws);
            
            return ws;
        } catch (error) {
            console.error('Error setting up real-time monitoring:', error);
            throw error;
        }
    }

    // Parse real-time transaction from logs
    async parseRealtimeTransaction(logs) {
        try {
            const signature = logs.signature;
            
            // Fetch full transaction details
            const txDetails = await heliusClient.parseTransaction(signature);
            
            // Parse as Orca transaction
            return this.parseOrcaTransaction(txDetails);
        } catch (error) {
            console.error('Error parsing real-time transaction:', error);
            return logs;
        }
    }

    // Method 4: Get wallet liquidity positions
    async getWalletLiquidityPositions(walletAddress) {
        try {
            showNotification('Fetching liquidity positions...', 'info');
            
            const positions = [];
            
            // Get Orca positions
            if (orcaClient.initialized || await orcaClient.initialize()) {
                const orcaPositions = await orcaClient.getPositions(walletAddress);
                positions.push(...orcaPositions.map(p => ({
                    ...p,
                    protocol: 'Orca'
                })));
            }
            
            // Get positions from other DEXes using Helius
            const tokenAccounts = await heliusClient.getTokenAccounts(walletAddress);
            
            // Identify LP tokens from other protocols
            for (const account of tokenAccounts) {
                const mint = account.account.data.parsed.info.mint;
                const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
                
                // Check if this is an LP token
                const poolInfo = await this.identifyLPToken(mint);
                if (poolInfo && poolInfo.protocol !== 'Orca') {
                    positions.push({
                        protocol: poolInfo.protocol,
                        pool: poolInfo.pool,
                        balance: balance,
                        mint: mint,
                        ...poolInfo
                    });
                }
            }
            
            return positions;
        } catch (error) {
            console.error('Error fetching liquidity positions:', error);
            throw error;
        }
    }

    // Identify LP token and its protocol
    async identifyLPToken(mint) {
        try {
            // Check against known LP token patterns
            // In production, you'd have a more comprehensive database
            
            // For now, return null if not identified
            return null;
        } catch (error) {
            console.error('Error identifying LP token:', error);
            return null;
        }
    }

    // Method 5: Bitquery GraphQL API (backup)
    async getBitqueryOrcaData(walletAddress, options = {}) {
        try {
            if (!this.bitqueryApiKey) {
                throw new Error('Bitquery API key not set');
            }
            
            const query = `
                query OrcaTransactions($wallet: String!, $limit: Int!) {
                    solana {
                        transfers(
                            options: {limit: $limit, desc: "block.timestamp.time"}
                            transferType: {is: "transfer"}
                            any: [
                                {sender: {is: $wallet}},
                                {receiver: {is: $wallet}}
                            ]
                            programId: {in: ["${this.PROGRAM_IDS.ORCA.WHIRLPOOL}", "${this.PROGRAM_IDS.ORCA.LEGACY_POOLS}"]}
                        ) {
                            block {
                                timestamp {
                                    time(format: "%Y-%m-%d %H:%M:%S")
                                }
                                height
                            }
                            transaction {
                                signature
                                feePayer
                                fee
                                success
                            }
                            sender {
                                address
                            }
                            receiver {
                                address
                            }
                            currency {
                                symbol
                                address
                                decimals
                            }
                            amount
                            instruction {
                                program {
                                    address
                                    name
                                }
                                action {
                                    name
                                }
                                data
                            }
                        }
                    }
                }
            `;
            
            const variables = {
                wallet: walletAddress,
                limit: options.limit || 100
            };
            
            const response = await fetch('https://graphql.bitquery.io/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': this.bitqueryApiKey
                },
                body: JSON.stringify({ query, variables })
            });
            
            const data = await response.json();
            
            if (data.errors) {
                throw new Error(data.errors[0].message);
            }
            
            return this.parseBitqueryData(data.data.solana.transfers);
        } catch (error) {
            console.error('Error fetching Bitquery data:', error);
            throw error;
        }
    }

    // Parse Bitquery data to match our format
    parseBitqueryData(transfers) {
        return transfers.map(transfer => ({
            signature: transfer.transaction.signature,
            timestamp: transfer.block.timestamp.time,
            slot: transfer.block.height,
            fee: transfer.transaction.fee,
            status: transfer.transaction.success ? 'success' : 'failed',
            type: this.determineBitqueryTransactionType(transfer),
            programId: transfer.instruction.program.address,
            details: {
                sender: transfer.sender.address,
                receiver: transfer.receiver.address,
                amount: transfer.amount,
                currency: transfer.currency
            }
        }));
    }

    // Determine transaction type from Bitquery data
    determineBitqueryTransactionType(transfer) {
        const action = transfer.instruction.action.name;
        
        if (action.includes('swap')) return 'SWAP';
        if (action.includes('addLiquidity')) return 'ADD_LIQUIDITY';
        if (action.includes('removeLiquidity')) return 'REMOVE_LIQUIDITY';
        
        return 'TRANSFER';
    }

    // Apply monitoring to any Solana DEX
    async monitorDEX(dexName, walletAddress, options = {}) {
        try {
            const programIds = this.PROGRAM_IDS[dexName.toUpperCase()];
            if (!programIds) {
                throw new Error(`Unknown DEX: ${dexName}`);
            }
            
            // Get transactions for the DEX
            const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${this.heliusApiKey}`;
            const response = await fetch(url);
            const transactions = await response.json();
            
            // Filter for DEX transactions
            const dexTransactions = transactions.filter(tx => {
                const txProgramIds = tx.accountData?.map(acc => acc.account) || [];
                return Object.values(programIds).some(id => txProgramIds.includes(id));
            });
            
            // Parse based on DEX type
            return dexTransactions.map(tx => this.parseDEXTransaction(tx, dexName));
        } catch (error) {
            console.error(`Error monitoring ${dexName}:`, error);
            throw error;
        }
    }

    // Parse transaction for any DEX
    parseDEXTransaction(tx, dexName) {
        // Similar to parseOrcaTransaction but generalized
        const enhanced = {
            signature: tx.signature,
            timestamp: tx.timestamp,
            dex: dexName,
            type: this.determineTransactionType(tx),
            details: {}
        };
        
        // Add DEX-specific parsing here
        
        return enhanced;
    }

    // Close WebSocket connections
    closeAllConnections() {
        for (const [wallet, ws] of this.websocketConnections) {
            ws.close();
        }
        this.websocketConnections.clear();
    }
}

// Create global instance
const poolMonitor = new SolanaPoolMonitor();

// Export for use in other modules
window.poolMonitor = poolMonitor; 