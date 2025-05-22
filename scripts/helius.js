// Helius API client to interact with Solana blockchain
class HeliusClient {
    constructor() {
        this.apiKey = 'b9ca8559-01e8-4823-8fa2-c7b2b5b0755c';
        this.mainnetRPC = 'https://mainnet.helius-rpc.com/?api-key=' + this.apiKey;
        this.apiBaseURL = 'https://api.helius.xyz/v0';
        this.websocketURL = 'wss://mainnet.helius-rpc.com/?api-key=' + this.apiKey;
        this.websocketConnection = null;
        this.eventListeners = {
            'transaction': [],
            'price': [],
            'pool': []
        };
    }

    // RPC Methods
    async getTokenInfo(tokenAddress) {
        try {
            const response = await fetch(this.mainnetRPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'token-info-' + Date.now(),
                    method: 'getToken',
                    params: [tokenAddress]
                })
            });

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching token info:', error);
            throw error;
        }
    }
    
    async getBalance(walletAddress) {
        try {
            const response = await fetch(this.mainnetRPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'balance-' + Date.now(),
                    method: 'getBalance',
                    params: [walletAddress]
                })
            });

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    }

    async getTokenAccounts(walletAddress) {
        try {
            const response = await fetch(this.mainnetRPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'token-accounts-' + Date.now(),
                    method: 'getTokenAccountsByOwner',
                    params: [
                        walletAddress,
                        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                        { encoding: 'jsonParsed' }
                    ]
                })
            });

            const data = await response.json();
            return data.result?.value || [];
        } catch (error) {
            console.error('Error fetching token accounts:', error);
            throw error;
        }
    }
    
    // Data API Methods
    async getTransactionHistory(walletAddress, limit = 20, before = '') {
        try {
            let url = `${this.apiBaseURL}/addresses/${walletAddress}/transactions/?api-key=${this.apiKey}&limit=${limit}`;
            if (before) {
                url += `&before=${before}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            throw error;
        }
    }
    
    async parseTransaction(signature) {
        try {
            const url = `${this.apiBaseURL}/transactions/?api-key=${this.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions: [signature]
                })
            });
            
            const data = await response.json();
            return data[0]; // Return the first transaction
        } catch (error) {
            console.error('Error parsing transaction:', error);
            throw error;
        }
    }
    
    // Identify LP positions from token accounts (using known LP token mints)
    async identifyLPPositions(walletAddress) {
        try {
            const tokenAccounts = await this.getTokenAccounts(walletAddress);
            const lpPositions = [];
            
            // Known LP token addresses (in a real implementation, we would have a more comprehensive list)
            const knownLPTokens = {
                'USDC/SOL': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',  // Orca USDC/SOL LP token
                'WBTC/ETH': '8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu', // Raydium WBTC/ETH LP token
                'USDT/USDC': 'JAa3gQySiTi8tH3dpkvgztJWHQC1vGXr5m6SQ9LEM55k'  // Raydium USDT/USDC LP token
            };
            
            for (const account of tokenAccounts) {
                const tokenInfo = account.account.data.parsed.info;
                const mint = tokenInfo.mint;
                
                // Check if the token is a known LP token
                for (const [poolName, lpTokenMint] of Object.entries(knownLPTokens)) {
                    if (mint === lpTokenMint) {
                        // This is an LP token, add to positions
                        lpPositions.push({
                            pool: poolName,
                            lpTokenAccount: account.pubkey,
                            lpTokenMint: mint,
                            amount: tokenInfo.tokenAmount.uiAmount
                        });
                        break;
                    }
                }
            }
            
            return lpPositions;
        } catch (error) {
            console.error('Error identifying LP positions:', error);
            throw error;
        }
    }
    
    // Fetch LP Pool data (APY, fees, etc.)
    async getLPPoolData(lpTokenMint) {
        try {
            // In a real implementation, we would fetch this data from a DEX API or compute it
            // For now, simulating with some realistic but mock data
            const mockPoolData = {
                'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': {
                    apy24h: 18.5,
                    feesEarned: 23.45,
                    inRange: true,
                    location: 'Orca',
                    token0: { symbol: 'SOL', price: 180.45 },
                    token1: { symbol: 'USDC', price: 1.00 }
                },
                '8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu': {
                    apy24h: 12.3,
                    feesEarned: 45.67,
                    inRange: true,
                    location: 'Raydium',
                    token0: { symbol: 'WBTC', price: 45234.56 },
                    token1: { symbol: 'ETH', price: 2145.78 }
                },
                'JAa3gQySiTi8tH3dpkvgztJWHQC1vGXr5m6SQ9LEM55k': {
                    apy24h: 8.7,
                    feesEarned: 12.34,
                    inRange: false,
                    location: 'Raydium',
                    token0: { symbol: 'USDT', price: 1.00 },
                    token1: { symbol: 'USDC', price: 1.00 }
                }
            };
            
            return mockPoolData[lpTokenMint] || {
                apy24h: 0,
                feesEarned: 0,
                inRange: false,
                location: 'Unknown',
                token0: { symbol: 'Unknown', price: 0 },
                token1: { symbol: 'Unknown', price: 0 }
            };
        } catch (error) {
            console.error('Error fetching LP pool data:', error);
            throw error;
        }
    }
    
    // WebSocket Methods
    connectWebSocket() {
        if (this.websocketConnection) {
            this.disconnectWebSocket();
        }
        
        try {
            this.websocketConnection = new WebSocket(this.websocketURL);
            
            this.websocketConnection.onopen = () => {
                console.log('WebSocket connection established');
                // Subscribe to account updates
                this.subscribeToAccounts();
            };
            
            this.websocketConnection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };
            
            this.websocketConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            this.websocketConnection.onclose = () => {
                console.log('WebSocket connection closed');
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            throw error;
        }
    }
    
    disconnectWebSocket() {
        if (this.websocketConnection) {
            this.websocketConnection.close();
            this.websocketConnection = null;
        }
    }
    
    subscribeToAccounts(accounts = []) {
        if (!this.websocketConnection || this.websocketConnection.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }
        
        // Subscribe to account updates
        this.websocketConnection.send(JSON.stringify({
            jsonrpc: '2.0',
            id: 'account-subscription-' + Date.now(),
            method: 'accountSubscribe',
            params: [
                accounts,
                { encoding: 'jsonParsed', commitment: 'finalized' }
            ]
        }));
    }
    
    handleWebSocketMessage(data) {
        // Handle different types of WebSocket messages
        if (data.method === 'accountNotification') {
            const accountInfo = data.params.result;
            // Trigger account update event
            this.triggerEvent('account', accountInfo);
        }
    }
    
    // Event handling
    addEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].push(callback);
        }
    }
    
    removeEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType] = this.eventListeners[eventType]
                .filter(cb => cb !== callback);
        }
    }
    
    triggerEvent(eventType, data) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventType} event listener:`, error);
                }
            });
        }
    }
}

// Global Helius client instance
const heliusClient = new HeliusClient(); 