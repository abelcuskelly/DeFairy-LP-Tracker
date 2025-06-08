// DeFairy Integration for Orca and other Solana DEXes
class DeFairyOrcaIntegration {
    constructor() {
        this.poolMonitor = window.poolMonitor;
        this.orcaClient = window.orcaClient;
    }

    // Get complete Orca portfolio for DeFairy dashboard
    async getOrcaPortfolio(walletAddress) {
        try {
            console.log('🧚‍♀️ Loading magical Orca portfolio...');
            showNotification('Loading Orca portfolio...', 'info');
            
            // Get all Orca transactions
            const transactions = await this.poolMonitor.getOrcaTransactions(walletAddress);
            
            // Get current liquidity positions
            const positions = await this.poolMonitor.getWalletLiquidityPositions(walletAddress);
            
            // Filter for Orca positions only
            const orcaPositions = positions.filter(p => p.protocol === 'Orca');
            
            // Calculate portfolio metrics
            const metrics = this.calculatePortfolioMetrics(transactions, orcaPositions);
            
            console.log('✨ Orca portfolio loaded successfully!');
            showNotification('Orca portfolio loaded!', 'success');
            
            return {
                transactions,
                positions: orcaPositions,
                metrics: {
                    totalValue: metrics.totalValue,
                    totalFeesEarned: metrics.totalFeesEarned,
                    profitLoss24h: metrics.profitLoss24h,
                    averageAPY: metrics.averageAPY,
                    activePositions: orcaPositions.length,
                    totalTransactions: transactions.length
                }
            };
        } catch (error) {
            console.error('Error getting Orca portfolio:', error);
            showNotification('Failed to load Orca portfolio', 'error');
            throw error;
        }
    }

    // Monitor Orca in real-time for DeFairy notifications
    startRealTimeMonitoring(walletAddress, callback) {
        console.log('🌊 Starting real-time Orca monitoring...');
        showNotification('Starting real-time Orca monitoring...', 'info');
        
        return this.poolMonitor.setupRealTimeOrcaMonitoring(walletAddress, (event) => {
            // Format for DeFairy UI
            const formatted = {
                type: 'orca_transaction',
                operation: event.data?.operation || event.data?.type || 'unknown',
                timestamp: new Date(),
                description: `Orca ${event.data?.operation || event.data?.type || 'activity'} detected`,
                signature: event.data?.signature,
                data: event.data,
                // Add magical sparkle effect
                magical: true
            };
            
            // Show notification
            showNotification(`🌊 ${formatted.description}`, 'info');
            
            callback(formatted);
        });
    }

    // Calculate portfolio metrics
    calculatePortfolioMetrics(transactions, positions) {
        // Calculate total value from positions
        const totalValue = positions.reduce((sum, pos) => {
            const value = pos.balance || pos.netPosition || 0;
            return sum + value;
        }, 0);
        
        // Calculate total fees earned from swap transactions
        const totalFeesEarned = transactions
            .filter(tx => tx.type === 'SWAP' || tx.operation === 'swap')
            .reduce((sum, tx) => sum + (tx.fees?.transaction || tx.fee || 0), 0) / 1e9; // Convert lamports to SOL
        
        // Calculate 24h P&L
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent24h = transactions.filter(tx => {
            const txTime = tx.timestamp ? new Date(tx.timestamp * 1000) : new Date(0);
            return txTime > yesterday;
        });
        
        const profitLoss24h = recent24h.reduce((sum, tx) => {
            if (tx.type === 'SWAP' || tx.operation === 'swap') {
                return sum + (tx.fees?.transaction || tx.fee || 0) / 1e9;
            }
            return sum;
        }, 0);
        
        // Calculate average APY from positions
        const averageAPY = positions.length > 0 
            ? positions.reduce((sum, pos) => sum + (pos.apy24h || 0), 0) / positions.length
            : 0;
        
        return {
            totalValue,
            totalFeesEarned,
            profitLoss24h,
            averageAPY: averageAPY || 15.5 // Default if no APY data
        };
    }

    // Get complete portfolio for all DEXes
    async getCompletePortfolio(walletAddress) {
        try {
            console.log('🧚‍♀️ Loading complete DeFi portfolio...');
            
            const portfolios = {};
            
            // Get Orca portfolio
            portfolios.orca = await this.getOrcaPortfolio(walletAddress);
            
            // Get Raydium portfolio
            try {
                const raydiumTxs = await this.poolMonitor.monitorDEX('RAYDIUM', walletAddress);
                portfolios.raydium = {
                    transactions: raydiumTxs,
                    positions: [],
                    metrics: { totalTransactions: raydiumTxs.length }
                };
            } catch (e) {
                console.error('Error loading Raydium:', e);
            }
            
            // Get Meteora portfolio
            try {
                const meteoraTxs = await this.poolMonitor.monitorDEX('METEORA', walletAddress);
                portfolios.meteora = {
                    transactions: meteoraTxs,
                    positions: [],
                    metrics: { totalTransactions: meteoraTxs.length }
                };
            } catch (e) {
                console.error('Error loading Meteora:', e);
            }
            
            // Calculate combined metrics
            const combinedMetrics = this.calculateCombinedMetrics(portfolios);
            
            return {
                portfolios,
                combinedMetrics,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Error getting complete portfolio:', error);
            throw error;
        }
    }

    // Calculate combined metrics across all DEXes
    calculateCombinedMetrics(portfolios) {
        let totalValue = 0;
        let totalFeesEarned = 0;
        let totalProfitLoss24h = 0;
        let totalPositions = 0;
        let totalTransactions = 0;
        
        Object.values(portfolios).forEach(portfolio => {
            if (portfolio.metrics) {
                totalValue += portfolio.metrics.totalValue || 0;
                totalFeesEarned += portfolio.metrics.totalFeesEarned || 0;
                totalProfitLoss24h += portfolio.metrics.profitLoss24h || 0;
                totalPositions += portfolio.metrics.activePositions || 0;
                totalTransactions += portfolio.metrics.totalTransactions || 0;
            }
        });
        
        return {
            totalValue,
            totalFeesEarned,
            totalProfitLoss24h,
            totalPositions,
            totalTransactions,
            dexCount: Object.keys(portfolios).length
        };
    }

    // Update DeFairy UI with portfolio data
    updateDeFairyUI(portfolioData) {
        try {
            // Update main portfolio stats
            if (portfolioData.combinedMetrics) {
                const metrics = portfolioData.combinedMetrics;
                
                // Update UI elements
                document.getElementById('totalBalance').textContent = 
                    uiManager.formatCurrency(metrics.totalValue);
                document.getElementById('feesHarvested').textContent = 
                    uiManager.formatCurrency(metrics.totalFeesEarned);
                document.getElementById('profitLoss').textContent = 
                    uiManager.formatCurrency(metrics.totalProfitLoss24h);
                
                // Add magical animation
                this.addMagicalAnimation();
            }
            
            // Update positions display
            if (portfolioData.portfolios?.orca?.positions) {
                this.displayOrcaPositions(portfolioData.portfolios.orca.positions);
            }
            
        } catch (error) {
            console.error('Error updating DeFairy UI:', error);
        }
    }

    // Display Orca positions with magical effects
    displayOrcaPositions(positions) {
        const container = document.getElementById('poolsContainer');
        if (!container) return;
        
        // Add Orca-specific styling
        positions.forEach(position => {
            const poolElement = document.createElement('div');
            poolElement.className = 'pool-row orca-pool magical-glow';
            poolElement.innerHTML = `
                <div class="pool-info">
                    <span class="pool-name">🌊 ${position.pool}</span>
                    <span class="pool-value">${uiManager.formatCurrency(position.balance)}</span>
                    <span class="pool-apy">${position.apy24h?.toFixed(2) || '0.00'}% APY</span>
                </div>
            `;
            container.appendChild(poolElement);
        });
    }

    // Add magical animation to UI
    addMagicalAnimation() {
        const elements = document.querySelectorAll('.stat-value');
        elements.forEach(el => {
            el.classList.add('magical-sparkle');
            setTimeout(() => el.classList.remove('magical-sparkle'), 1000);
        });
    }
}

// Create global instance
const defairyIntegration = new DeFairyOrcaIntegration();

// Export for use in other modules
window.defairyIntegration = defairyIntegration;

// Example usage function
async function integrateOrcaWithDeFairy() {
    const walletAddress = document.getElementById('walletInput')?.value;
    
    if (!walletAddress) {
        showNotification('Please enter a wallet address', 'warning');
        return;
    }
    
    try {
        // Get complete portfolio
        const portfolio = await defairyIntegration.getCompletePortfolio(walletAddress);
        console.log('Complete Portfolio:', portfolio);
        
        // Update UI
        defairyIntegration.updateDeFairyUI(portfolio);
        
        // Start real-time monitoring
        const ws = defairyIntegration.startRealTimeMonitoring(walletAddress, (transaction) => {
            console.log('🌊 New Orca transaction:', transaction);
            // Update UI with new transaction
            poolMonitorUI.displayRealtimeTransaction(transaction.data);
        });
        
        // Store WebSocket for cleanup
        window.activeOrcaMonitor = ws;
        
    } catch (error) {
        console.error('Integration error:', error);
        showNotification('Failed to integrate Orca data', 'error');
    }
}

// Add magical sparkle CSS
const style = document.createElement('style');
style.textContent = `
    .magical-glow {
        animation: magicalGlow 2s ease-in-out infinite;
    }
    
    @keyframes magicalGlow {
        0%, 100% { box-shadow: 0 0 5px rgba(74, 144, 226, 0.5); }
        50% { box-shadow: 0 0 20px rgba(74, 144, 226, 0.8), 0 0 30px rgba(74, 144, 226, 0.4); }
    }
    
    .magical-sparkle {
        animation: sparkle 1s ease-in-out;
    }
    
    @keyframes sparkle {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .orca-pool {
        border-left: 4px solid #4a90e2;
        background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(74, 144, 226, 0.05) 100%);
    }
`;
document.head.appendChild(style); 