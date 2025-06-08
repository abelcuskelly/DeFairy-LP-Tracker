// Auto-rebalancing functionality for LP positions
class AutoRebalancer {
    constructor() {
        this.monitoring = false;
        this.walletAddress = null;
        this.positions = [];
        this.thresholds = {
            priceDeviation: 5, // Percent of price deviation from optimal
            rebalancingInterval: 86400000, // 24 hours in milliseconds
            gasLimit: 0.05 // Maximum SOL to spend on gas
        };
        this.lastRebalance = null;
        this.pendingRebalances = [];
    }
    
    // Start monitoring positions for auto-rebalancing
    startMonitoring(walletAddress, positions) {
        if (this.monitoring) {
            this.stopMonitoring();
        }
        
        this.walletAddress = walletAddress;
        this.positions = positions || [];
        this.monitoring = true;
        
        console.log('Starting auto-rebalance monitoring for wallet:', walletAddress);
        
        // Subscribe to relevant WebSocket events
        heliusClient.addEventListener('transaction', this.handleTransactionEvent.bind(this));
        heliusClient.addEventListener('price', this.handlePriceEvent.bind(this));
        
        // Initial check for rebalancing opportunities
        this.checkForRebalancingOpportunities();
    }
    
    // Stop monitoring positions
    stopMonitoring() {
        console.log('Stopping auto-rebalance monitoring');
        
        this.monitoring = false;
        this.walletAddress = null;
        this.positions = [];
        
        // Unsubscribe from events
        heliusClient.removeEventListener('transaction', this.handleTransactionEvent.bind(this));
        heliusClient.removeEventListener('price', this.handlePriceEvent.bind(this));
    }
    
    // Update monitored positions
    updatePositions(positions) {
        this.positions = positions || [];
        
        // Check if any positions need rebalancing
        this.checkForRebalancingOpportunities();
    }
    
    // Handle transaction events
    handleTransactionEvent(transaction) {
        if (!this.monitoring) return;
        
        // Check if transaction affects monitored positions
        // In a real implementation, we would:
        // 1. Parse the transaction to see if it affects any LP positions
        // 2. If so, update our tracking and check for rebalancing
        
        console.log('Transaction event received:', transaction);
    }
    
    // Handle price events
    handlePriceEvent(priceData) {
        if (!this.monitoring) return;
        
        // Check if price changes affect balance of positions
        // In a real implementation, we would:
        // 1. Calculate if price changes have affected the optimal token ratio
        // 2. If deviation exceeds threshold, trigger rebalancing
        
        console.log('Price event received:', priceData);
        this.checkForRebalancingOpportunities();
    }
    
    // Check if any positions need rebalancing
    async checkForRebalancingOpportunities() {
        if (!this.monitoring || !this.walletAddress) return;
        
        try {
            // Get all pools across DEXs
            const allPools = [];
            if (this.positions.orca) allPools.push(...this.positions.orca);
            if (this.positions.raydium) allPools.push(...this.positions.raydium);
            
            // Check which positions are out of range
            const outOfRangePools = allPools.filter(pool => !pool.inRange);
            
            if (outOfRangePools.length === 0) {
                console.log('No positions need rebalancing');
                return [];
            }
            
            // Calculate rebalancing opportunities
            const opportunities = outOfRangePools.map(pool => {
                // Calculate optimal token amounts and fees
                const token0 = pool.token0;
                const token1 = pool.token1;
                const currentRatio = (token0.amount * token0.price) / (token1.amount * token1.price);
                const optimalRatio = 1.0; // 50/50 split is optimal for most LP positions
                const deviation = Math.abs(currentRatio - optimalRatio) * 100;
                
                // Estimate fees
                const estimatedGasFee = 0.01; // In SOL, would be calculated based on network conditions
                
                return {
                    pool: pool.pool,
                    deviation,
                    currentRatio,
                    optimalRatio,
                    token0: {
                        symbol: token0.symbol,
                        currentAmount: token0.amount,
                        targetAmount: (token0.amount + token1.amount) / 2 // Simplified 50/50 rebalancing
                    },
                    token1: {
                        symbol: token1.symbol,
                        currentAmount: token1.amount,
                        targetAmount: (token0.amount + token1.amount) / 2 // Simplified 50/50 rebalancing
                    },
                    estimatedGasFee,
                    profitable: deviation > this.thresholds.priceDeviation && estimatedGasFee < this.thresholds.gasLimit
                };
            });
            
            // Filter to only profitable rebalancing opportunities
            const profitableOpportunities = opportunities.filter(op => op.profitable);
            
            if (profitableOpportunities.length > 0) {
                console.log('Found profitable rebalancing opportunities:', profitableOpportunities);
                this.pendingRebalances = profitableOpportunities;
                
                // In a production application, we would:
                // 1. Display notification to user
                // 2. Get user approval
                // 3. Execute rebalancing transactions
            }
            
            return opportunities;
        } catch (error) {
            console.error('Error checking for rebalancing opportunities:', error);
            return [];
        }
    }
    
    // Execute auto-rebalancing
    async executeRebalance(opportunity) {
        if (!this.monitoring || !this.walletAddress) {
            console.error('Not monitoring or wallet address not set');
            return { success: false, error: 'Not monitoring' };
        }
        
        try {
            console.log('Executing rebalance for pool:', opportunity.pool);
            
            // In a real implementation, this would:
            // 1. Withdraw liquidity from the pool
            // 2. Swap tokens to achieve optimal ratio
            // 3. Re-deposit liquidity
            
            // For this demo, just update status
            this.lastRebalance = {
                timestamp: Date.now(),
                pool: opportunity.pool,
                success: true
            };
            
            // Remove from pending rebalances
            this.pendingRebalances = this.pendingRebalances.filter(op => op.pool !== opportunity.pool);
            
            return { success: true };
        } catch (error) {
            console.error('Error executing rebalance:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Get pending rebalances
    getPendingRebalances() {
        return this.pendingRebalances;
    }
    
    // Get last rebalance
    getLastRebalance() {
        return this.lastRebalance;
    }
    
    // Update threshold settings
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }
}

// Global auto-rebalancer instance
const autoRebalancer = new AutoRebalancer();

// Pool-specific auto-rebalancing with alert system
let poolRebalancingConfig = {};
let notificationSettings = {
    telegram: { enabled: false, chatId: null },
    email: { enabled: false, address: null },
    inApp: { enabled: true }
};

// Initialize pool rebalancing configuration
function initializePoolRebalancing() {
    const savedConfig = localStorage.getItem('poolRebalancingConfig');
    if (savedConfig) {
        poolRebalancingConfig = JSON.parse(savedConfig);
    }
    
    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedNotifications) {
        notificationSettings = JSON.parse(savedNotifications);
    }
}

// Configure rebalancing for a specific pool
function configurePoolRebalancing(poolAddress, settings) {
    poolRebalancingConfig[poolAddress] = {
        enabled: settings.enabled || false,
        thresholds: {
            imbalanceRatio: settings.imbalanceRatio || 0.25, // 25/75 split
            priceDeviation: settings.priceDeviation || 0.05, // 5% price movement
            outOfRange: settings.outOfRange || true
        },
        lastChecked: Date.now(),
        notifications: {
            telegram: settings.telegram || false,
            email: settings.email || false,
            inApp: settings.inApp || true
        }
    };
    
    localStorage.setItem('poolRebalancingConfig', JSON.stringify(poolRebalancingConfig));
}

// Toggle rebalancing for all pools
function toggleAllPoolsRebalancing(enabled) {
    const pools = window.portfolioPools || [];
    pools.forEach(pool => {
        if (pool.address) {
            poolRebalancingConfig[pool.address] = {
                ...poolRebalancingConfig[pool.address],
                enabled: enabled
            };
        }
    });
    
    localStorage.setItem('poolRebalancingConfig', JSON.stringify(poolRebalancingConfig));
    updatePoolRebalancingUI();
}

// Check if a pool needs rebalancing
async function checkPoolRebalancing(pool) {
    const config = poolRebalancingConfig[pool.address];
    if (!config || !config.enabled) return null;
    
    const alerts = [];
    
    // Check token balance ratio
    if (pool.tokenA && pool.tokenB) {
        const totalValue = pool.tokenA.valueUSD + pool.tokenB.valueUSD;
        const tokenARatio = pool.tokenA.valueUSD / totalValue;
        const tokenBRatio = pool.tokenB.valueUSD / totalValue;
        
        // Check if imbalance exceeds threshold
        if (Math.abs(tokenARatio - 0.5) > config.thresholds.imbalanceRatio) {
            alerts.push({
                type: 'imbalance',
                severity: 'high',
                message: `Pool ${pool.tokenPair} is imbalanced: ${(tokenARatio * 100).toFixed(1)}%/${(tokenBRatio * 100).toFixed(1)}%`,
                recommendation: `Rebalance to 50/50 ratio`,
                tokenARatio,
                tokenBRatio
            });
        }
    }
    
    // Check if position is out of range
    if (config.thresholds.outOfRange && pool.status === 'Out of Range') {
        alerts.push({
            type: 'outOfRange',
            severity: 'critical',
            message: `Pool ${pool.tokenPair} position is out of range`,
            recommendation: 'Reposition liquidity to active price range'
        });
    }
    
    // Check price deviation (if historical data available)
    if (pool.priceChange24h && Math.abs(pool.priceChange24h) > config.thresholds.priceDeviation) {
        alerts.push({
            type: 'priceDeviation',
            severity: 'medium',
            message: `Pool ${pool.tokenPair} price changed ${(pool.priceChange24h * 100).toFixed(1)}% in 24h`,
            recommendation: 'Consider adjusting position range'
        });
    }
    
    return alerts.length > 0 ? alerts : null;
}

// Send notifications for rebalancing alerts
async function sendRebalancingNotifications(pool, alerts) {
    // In-app notification
    if (notificationSettings.inApp.enabled) {
        showInAppNotification(pool, alerts);
    }
    
    // Telegram notification
    if (notificationSettings.telegram.enabled && notificationSettings.telegram.chatId) {
        await sendTelegramNotification(pool, alerts);
    }
    
    // Email notification
    if (notificationSettings.email.enabled && notificationSettings.email.address) {
        await sendEmailNotification(pool, alerts);
    }
}

// Show in-app notification
function showInAppNotification(pool, alerts) {
    const notification = document.createElement('div');
    notification.className = 'rebalancing-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Rebalancing Alert: ${pool.tokenPair}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-body">
            ${alerts.map(alert => `
                <div class="alert-item ${alert.severity}">
                    <strong>${alert.type}:</strong> ${alert.message}
                    <div class="recommendation">${alert.recommendation}</div>
                </div>
            `).join('')}
            <button class="btn btn-primary" onclick="openRebalancingModal('${pool.address}')">
                View Rebalancing Options
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 30000);
}

// Send Telegram notification
async function sendTelegramNotification(pool, alerts) {
    try {
        const message = `🚨 *DeFairy Rebalancing Alert*\n\n` +
            `Pool: ${pool.tokenPair}\n` +
            `Location: ${pool.location}\n\n` +
            alerts.map(alert => `⚠️ ${alert.message}\n💡 ${alert.recommendation}`).join('\n\n');
        
        // This would require a backend service to send Telegram messages
        await fetch('/api/notifications/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: notificationSettings.telegram.chatId,
                message: message
            })
        });
    } catch (error) {
        console.error('Failed to send Telegram notification:', error);
    }
}

// Send email notification
async function sendEmailNotification(pool, alerts) {
    try {
        // This would require a backend service to send emails
        await fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: notificationSettings.email.address,
                subject: `DeFairy: Rebalancing Alert for ${pool.tokenPair}`,
                alerts: alerts,
                pool: pool
            })
        });
    } catch (error) {
        console.error('Failed to send email notification:', error);
    }
}

// Monitor all enabled pools
async function monitorPoolsForRebalancing() {
    const pools = window.portfolioPools || [];
    
    for (const pool of pools) {
        if (poolRebalancingConfig[pool.address]?.enabled) {
            const alerts = await checkPoolRebalancing(pool);
            if (alerts) {
                await sendRebalancingNotifications(pool, alerts);
            }
        }
    }
}

// Update UI to show pool-specific rebalancing options
function updatePoolRebalancingUI() {
    const pools = window.portfolioPools || [];
    
    pools.forEach(pool => {
        const poolRow = document.querySelector(`[data-pool-address="${pool.address}"]`);
        if (poolRow) {
            const config = poolRebalancingConfig[pool.address];
            const rebalanceCell = poolRow.querySelector('.rebalance-cell');
            
            if (!rebalanceCell) {
                // Add rebalancing column if it doesn't exist
                const cell = document.createElement('td');
                cell.className = 'rebalance-cell';
                poolRow.appendChild(cell);
            }
            
            rebalanceCell.innerHTML = `
                <label class="rebalance-toggle">
                    <input type="checkbox" 
                           ${config?.enabled ? 'checked' : ''} 
                           onchange="togglePoolRebalancing('${pool.address}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            `;
        }
    });
}

// Toggle rebalancing for a specific pool
function togglePoolRebalancing(poolAddress, enabled) {
    configurePoolRebalancing(poolAddress, {
        ...poolRebalancingConfig[poolAddress],
        enabled: enabled
    });
    
    if (enabled) {
        // Check immediately when enabled
        const pool = window.portfolioPools.find(p => p.address === poolAddress);
        if (pool) {
            checkPoolRebalancing(pool).then(alerts => {
                if (alerts) {
                    sendRebalancingNotifications(pool, alerts);
                }
            });
        }
    }
}

// Open rebalancing modal for detailed options
function openRebalancingModal(poolAddress) {
    const pool = window.portfolioPools.find(p => p.address === poolAddress);
    if (!pool) return;
    
    // This would open a modal with rebalancing options
    // For now, we'll create a simple alert
    const message = `Rebalancing Options for ${pool.tokenPair}:\n\n` +
        `1. Manual Rebalance: Adjust your position manually\n` +
        `2. Set Alert Thresholds: Customize when to receive alerts\n` +
        `3. View Historical Performance: Analyze past rebalancing opportunities\n\n` +
        `Would you like to proceed with manual rebalancing?`;
    
    if (confirm(message)) {
        // Open the pool on the respective DEX
        window.open(pool.link, '_blank');
    }
}

// Start monitoring (called every 5 minutes)
function startRebalancingMonitor() {
    initializePoolRebalancing();
    
    // Initial check
    monitorPoolsForRebalancing();
    
    // Set up periodic monitoring
    setInterval(() => {
        monitorPoolsForRebalancing();
    }, 5 * 60 * 1000); // Check every 5 minutes
}

// Initialize when pools are loaded
window.addEventListener('poolsLoaded', () => {
    updatePoolRebalancingUI();
    startRebalancingMonitor();
}); 