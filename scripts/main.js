// Main application logic and initialization
class DeFairyApp {
    constructor() {
        this.refreshInterval = null;
        this.isLoading = false;
        this.activeWallet = null;
        this.autoRebalancingEnabled = false;
    }

    async init() {
        console.log('🧚‍♀️ DeFairy App Initializing...');
        
        // Initialize UI
        this.setupEventListeners();
        
        // Check for wallet connection on load
        await this.checkWalletConnection();
        
        console.log('✨ DeFairy App Ready!');
    }

    setupEventListeners() {
        // Wallet address input change
        const walletInput = document.getElementById('walletAddress');
        walletInput.addEventListener('input', this.debounce(this.onWalletAddressChange.bind(this), 500));
        
        // Auto-refresh toggle (could add this as a setting)
        this.startAutoRefresh();
        
        // Setup Helius event listeners
        this.setupHeliusEventListeners();
    }
    
    setupHeliusEventListeners() {
        // Listen for price updates
        heliusClient.addEventListener('price', (priceData) => {
            console.log('Price update received:', priceData);
            // Update UI with new price data
            if (this.activeWallet && !this.isLoading) {
                this.refreshPortfolio(false);
            }
        });
        
        // Listen for account updates
        heliusClient.addEventListener('account', (accountInfo) => {
            console.log('Account update received:', accountInfo);
            // Update UI with new account data
            if (this.activeWallet && !this.isLoading) {
                this.refreshPortfolio(false);
            }
        });
    }

    async checkWalletConnection() {
        try {
            if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
                const publicKey = window.solana.publicKey.toString();
                walletManager.publicKey = publicKey;
                walletManager.connectedWallet = 'phantom';
                document.getElementById('walletAddress').value = publicKey;
                
                // Auto-load portfolio if wallet is connected
                await this.loadPortfolio();
            }
        } catch (error) {
            console.log('No wallet connection found on startup');
        }
    }

    async onWalletAddressChange() {
        const address = document.getElementById('walletAddress').value;
        if (address && this.isValidSolanaAddress(address)) {
            await this.loadPortfolio();
        }
    }

    isValidSolanaAddress(address) {
        // Basic Solana address validation (base58, length check)
        try {
            return address.length >= 32 && address.length <= 44 && 
                   /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
        } catch {
            return false;
        }
    }

    async loadPortfolio() {
        if (this.isLoading) return;
        
        const walletAddress = walletManager.getWalletAddress();
        if (!walletAddress) {
            showNotification('Please enter a wallet address or connect your wallet.', 'warning');
            return;
        }

        if (!this.isValidSolanaAddress(walletAddress)) {
            showNotification('Please enter a valid Solana wallet address.', 'error');
            return;
        }
        
        this.activeWallet = walletAddress;
        await this.refreshPortfolio(true);
    }
    
    async refreshPortfolio(showLoadingUI = true) {
        if (this.isLoading || !this.activeWallet) return;
        
        this.isLoading = true;
        if (showLoadingUI) {
            showNotification('Loading portfolio data...', 'info');
            this.showLoadingStates();
        }
        
        try {
            // Fetch user positions using Helius API
            const positions = await apiManager.getUserPositions(this.activeWallet);
            
            // Calculate metrics
            const metrics = apiManager.calculatePortfolioMetrics(positions);
            
            // Update UI
            uiManager.updatePortfolioStats(metrics);
            uiManager.renderPools(metrics.pools);
            
            // Update auto-rebalancer if enabled
            if (this.autoRebalancingEnabled) {
                autoRebalancer.updatePositions(positions);
            }
            
            if (showLoadingUI) {
                showNotification('Portfolio loaded successfully! ✨', 'success');
            }
            
            // Check for rebalancing opportunities
            await this.checkRebalancingOpportunities(positions);
            
        } catch (error) {
            console.error('Error loading portfolio:', error);
            if (showLoadingUI) {
                showNotification('Failed to load portfolio: ' + error.message, 'error');
                this.showErrorStates();
            }
        } finally {
            this.isLoading = false;
        }
    }
    
    async checkRebalancingOpportunities(positions) {
        try {
            // Get rebalancing recommendations
            const recommendations = await apiManager.getRebalancingRecommendations(positions);
            
            // If there are recommendations, show a notification
            if (recommendations && recommendations.recommendations && recommendations.recommendations.length > 0) {
                showNotification(`Rebalancing opportunity: ${recommendations.message}`, 'info');
                
                // If auto-rebalancing is enabled, start monitoring
                if (this.autoRebalancingEnabled) {
                    autoRebalancer.startMonitoring(this.activeWallet, positions);
                }
            }
        } catch (error) {
            console.error('Error checking rebalancing opportunities:', error);
        }
    }
    
    toggleAutoRebalancing(enable) {
        this.autoRebalancingEnabled = enable;
        
        if (enable && this.activeWallet) {
            showNotification('Auto-rebalancing enabled! Monitoring positions for optimal performance.', 'success');
            // Start monitoring positions
            autoRebalancer.startMonitoring(this.activeWallet);
        } else {
            // Stop monitoring
            autoRebalancer.stopMonitoring();
            showNotification('Auto-rebalancing disabled.', 'info');
        }
        
        // Update button state
        uiManager.updateRebalancingButtonState(enable);
    }

    showLoadingStates() {
        // Show loading spinners in portfolio stats
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(stat => {
            if (stat.id !== 'outOfRange') {
                stat.innerHTML = '<div class="loading"></div>';
            }
        });
        
        // Show loading in pools container
        document.getElementById('poolsContainer').innerHTML = `
            <div class="loading-pools">
                <div class="loading"></div>
                <span>Loading your liquidity pools...</span>
            </div>
        `;
    }

    showErrorStates() {
        // Reset to default values
        document.getElementById('totalBalance').textContent = '$0.00';
        document.getElementById('profitLoss').textContent = '$0.00';
        document.getElementById('avgApy').textContent = '0.00%';
        document.getElementById('feesHarvested').textContent = '$0.00';
        
        document.getElementById('poolsContainer').innerHTML = `
            <div class="loading-pools">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b; font-size: 2rem;"></i>
                <span>Failed to load pools. Please try again.</span>
            </div>
        `;
    }

    startAutoRefresh() {
        // Refresh every minute if wallet is connected
        this.refreshInterval = setInterval(async () => {
            if (this.activeWallet && !this.isLoading) {
                console.log('🔄 Auto-refreshing portfolio data...');
                await this.refreshPortfolio(false);
            }
        }, 60000); // 1 minute
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Also stop auto-rebalancing
        if (this.autoRebalancingEnabled) {
            this.toggleAutoRebalancing(false);
        }
    }

    // Utility function for debouncing input events
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'rgba(50, 205, 50, 0.2)' : 
                   type === 'error' ? 'rgba(255, 107, 107, 0.2)' : 
                   type === 'warning' ? 'rgba(255, 165, 0, 0.2)' : 
                   'rgba(75, 104, 238, 0.2)'};
        border: 1px solid ${type === 'success' ? '#32cd32' : 
                           type === 'error' ? '#ff6b6b' : 
                           type === 'warning' ? '#ffa500' : 
                           '#4b68ee'};
        border-radius: 10px;
        color: white;
        z-index: 10000;
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Global function for load portfolio button
async function loadPortfolio() {
    await app.loadPortfolio();
}

// Toggle auto-rebalancing (can be connected to a UI element)
function toggleAutoRebalancing() {
    if (app) {
        app.toggleAutoRebalancing(!app.autoRebalancingEnabled);
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', async function() {
    app = new DeFairyApp();
    await app.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (app) {
        app.stopAutoRefresh();
    }
}); 