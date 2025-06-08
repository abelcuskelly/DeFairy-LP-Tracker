// Wallet connection and management
class WalletManager {
    constructor() {
        this.connectedWallet = null;
        this.publicKey = null;
    }

    async connectPhantom() {
        try {
            if (window.solana && window.solana.isPhantom) {
                const response = await window.solana.connect();
                this.connectedWallet = 'phantom';
                this.publicKey = response.publicKey.toString();
                
                document.getElementById('walletInput').value = this.publicKey;
                showNotification('Wallet connected successfully!', 'success');
                
                // Automatically load portfolio with DEX data
                await loadPortfolio();
                
                return {
                    success: true,
                    publicKey: this.publicKey
                };
            } else {
                throw new Error('Phantom wallet not found. Please install Phantom wallet.');
            }
        } catch (error) {
            showNotification('Failed to connect wallet: ' + error.message, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }

    async disconnectWallet() {
        try {
            if (window.solana && this.connectedWallet) {
                await window.solana.disconnect();
            }
            
            this.connectedWallet = null;
            this.publicKey = null;
            document.getElementById('walletInput').value = '';
            
            // Stop real-time monitoring if active
            if (window.activeOrcaMonitor) {
                window.activeOrcaMonitor.close();
                window.activeOrcaMonitor = null;
            }
            
            showNotification('Wallet disconnected', 'info');
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    }

    getWalletAddress() {
        return document.getElementById('walletInput').value || this.publicKey;
    }

    isConnected() {
        return this.connectedWallet !== null;
    }
}

// Global wallet manager instance
const walletManager = new WalletManager();

// Global function for button onclick
async function connectWallet() {
    await walletManager.connectPhantom();
} 