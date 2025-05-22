// Main application logic and initialization
class DeFairyApp {
    constructor() {
        this.refreshInterval = null;
        this.isLoading = false;
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

        this.isLoading = true;
        showNotification('Loading portfolio data...', 'info');
        
        try {
            // Show loading states
            this.showLoadingStates();
            
            // Fetch user positions
            const positions = await apiManager.getUserPositions(walletAddress);
            
            // Calculate metrics
            const metrics = apiManager.calculatePortfolioMetrics(positions);
            
            // Update UI
            uiManager.updatePortfolioStats(metrics);
            uiManager.renderPools(metrics.pools);
            
            showNotification('Portfolio loaded successfully! ✨', 'success');
            
        } catch (error) {
            console.error('Error loading portfolio:', error);
            showNotification('Failed to load portfolio: ' + error.message, 'error');
            this.showErrorStates();
        } finally {
            this.isLoading = false;
        }
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
            const walletAddress = walletManager.getWalletAddress();
            if (walletAddress && !this.isLoading) {
                console.log('🔄 Auto-refreshing portfolio data...');
                try {
                    const positions = await apiManager.getUserPositions(walletAddress);
                    const metrics = apiManager.calculatePortfolioMetrics(positions);
                    uiManager.updatePortfolioStats(metrics);
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }
        }, 60000); // 1 minute
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
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