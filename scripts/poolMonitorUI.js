// Pool Monitor UI Components
class PoolMonitorUI {
    constructor() {
        this.activeMonitors = new Map();
        this.transactionHistory = [];
    }

    // Initialize pool monitoring UI
    initializeUI() {
        // Add monitoring section to the page
        const monitoringSection = document.createElement('section');
        monitoringSection.className = 'pool-monitoring-section';
        monitoringSection.innerHTML = `
            <div class="section-header">
                <i class="fas fa-chart-line"></i>
                Pool Activity Monitor
            </div>
            
            <div class="monitor-controls">
                <select id="monitorType" class="monitor-select">
                    <option value="wallet">Monitor Wallet</option>
                    <option value="pool">Monitor Specific Pool</option>
                    <option value="realtime">Real-time Monitoring</option>
                </select>
                
                <input type="text" id="monitorAddress" placeholder="Enter address..." class="monitor-input">
                
                <select id="dexSelect" class="monitor-select">
                    <option value="ORCA">Orca</option>
                    <option value="RAYDIUM">Raydium</option>
                    <option value="METEORA">Meteora</option>
                </select>
                
                <button onclick="startMonitoring()" class="btn btn-primary">
                    <i class="fas fa-play"></i> Start Monitoring
                </button>
                
                <button onclick="stopMonitoring()" class="btn btn-secondary">
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
            
            <div id="monitoringResults" class="monitoring-results">
                <!-- Results will be displayed here -->
            </div>
            
            <div id="transactionHistory" class="transaction-history" style="display: none;">
                <h3>Transaction History</h3>
                <div id="transactionList"></div>
            </div>
        `;
        
        // Insert after pools section
        const poolsSection = document.querySelector('.pools-section');
        if (poolsSection) {
            poolsSection.parentNode.insertBefore(monitoringSection, poolsSection.nextSibling);
        }
    }

    // Start monitoring based on selected type
    async startMonitoring() {
        try {
            const monitorType = document.getElementById('monitorType').value;
            const address = document.getElementById('monitorAddress').value;
            const dex = document.getElementById('dexSelect').value;
            
            if (!address) {
                showNotification('Please enter an address', 'warning');
                return;
            }
            
            // Clear previous results
            this.clearResults();
            
            switch (monitorType) {
                case 'wallet':
                    await this.monitorWallet(address, dex);
                    break;
                case 'pool':
                    await this.monitorPool(address);
                    break;
                case 'realtime':
                    await this.startRealtimeMonitoring(address, dex);
                    break;
            }
        } catch (error) {
            console.error('Error starting monitoring:', error);
            showNotification('Failed to start monitoring: ' + error.message, 'error');
        }
    }

    // Monitor wallet transactions
    async monitorWallet(walletAddress, dex) {
        try {
            showNotification(`Monitoring ${dex} transactions for wallet...`, 'info');
            
            let transactions;
            if (dex === 'ORCA') {
                transactions = await poolMonitor.getOrcaTransactions(walletAddress);
            } else {
                transactions = await poolMonitor.monitorDEX(dex, walletAddress);
            }
            
            this.displayTransactions(transactions);
            
            // Also get current positions
            const positions = await poolMonitor.getWalletLiquidityPositions(walletAddress);
            this.displayPositions(positions);
            
        } catch (error) {
            console.error('Error monitoring wallet:', error);
            this.displayError(error.message);
        }
    }

    // Monitor specific pool
    async monitorPool(poolAddress) {
        try {
            showNotification('Monitoring pool activity...', 'info');
            
            const transactions = await poolMonitor.monitorSpecificPool(poolAddress);
            this.displayTransactions(transactions);
            
        } catch (error) {
            console.error('Error monitoring pool:', error);
            this.displayError(error.message);
        }
    }

    // Start real-time monitoring
    async startRealtimeMonitoring(address, dex) {
        try {
            showNotification('Starting real-time monitoring...', 'info');
            
            // Stop any existing monitors
            this.stopAllMonitors();
            
            const ws = poolMonitor.setupRealTimeOrcaMonitoring(address, (event) => {
                this.handleRealtimeEvent(event);
            });
            
            this.activeMonitors.set(address, ws);
            
            // Display real-time status
            this.displayRealtimeStatus(true);
            
        } catch (error) {
            console.error('Error starting real-time monitoring:', error);
            this.displayError(error.message);
        }
    }

    // Handle real-time event
    handleRealtimeEvent(event) {
        console.log('Real-time event:', event);
        
        if (event.type === 'new_transaction') {
            // Add to transaction history
            this.transactionHistory.unshift(event.data);
            
            // Keep only last 50 transactions
            if (this.transactionHistory.length > 50) {
                this.transactionHistory.pop();
            }
            
            // Update display
            this.displayRealtimeTransaction(event.data);
        } else if (event.type === 'account_update') {
            // Handle account updates
            this.displayAccountUpdate(event.data);
        }
    }

    // Display transactions
    displayTransactions(transactions) {
        const resultsDiv = document.getElementById('monitoringResults');
        
        if (!transactions || transactions.length === 0) {
            resultsDiv.innerHTML = '<p>No transactions found</p>';
            return;
        }
        
        resultsDiv.innerHTML = `
            <h3>Found ${transactions.length} transactions</h3>
            <div class="transaction-grid">
                ${transactions.map(tx => this.createTransactionCard(tx)).join('')}
            </div>
        `;
        
        // Show transaction history section
        document.getElementById('transactionHistory').style.display = 'block';
        this.updateTransactionHistory(transactions);
    }

    // Create transaction card
    createTransactionCard(tx) {
        const typeIcon = this.getTransactionTypeIcon(tx.type);
        const statusClass = tx.status === 'success' ? 'success' : 'error';
        
        let detailsHtml = '';
        if (tx.type === 'SWAP' && tx.details.swapIn && tx.details.swapOut) {
            const swapIn = Object.values(tx.details.swapIn)[0];
            const swapOut = Object.values(tx.details.swapOut)[0];
            detailsHtml = `
                <div class="swap-details">
                    <span>${swapIn?.amount?.toFixed(4)} ${swapIn?.symbol}</span>
                    <i class="fas fa-arrow-right"></i>
                    <span>${swapOut?.amount?.toFixed(4)} ${swapOut?.symbol}</span>
                </div>
            `;
        } else if (tx.type.includes('LIQUIDITY')) {
            detailsHtml = `
                <div class="liquidity-details">
                    ${Object.entries(tx.details.tokens || {}).map(([mint, data]) => 
                        `<span>${data.change > 0 ? '+' : ''}${data.change.toFixed(4)} ${data.symbol}</span>`
                    ).join('<br>')}
                </div>
            `;
        }
        
        return `
            <div class="transaction-card ${statusClass}">
                <div class="tx-header">
                    <span class="tx-type">
                        ${typeIcon} ${tx.type}
                    </span>
                    <span class="tx-time">${new Date(tx.timestamp * 1000).toLocaleString()}</span>
                </div>
                ${detailsHtml}
                <div class="tx-footer">
                    <a href="https://solscan.io/tx/${tx.signature}" target="_blank" class="tx-link">
                        View on Solscan <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span class="tx-fee">Fee: ${(tx.fee / 1e9).toFixed(6)} SOL</span>
                </div>
            </div>
        `;
    }

    // Get transaction type icon
    getTransactionTypeIcon(type) {
        const icons = {
            'SWAP': '<i class="fas fa-exchange-alt"></i>',
            'INCREASE_LIQUIDITY': '<i class="fas fa-plus-circle"></i>',
            'DECREASE_LIQUIDITY': '<i class="fas fa-minus-circle"></i>',
            'ADD_LIQUIDITY': '<i class="fas fa-plus-circle"></i>',
            'REMOVE_LIQUIDITY': '<i class="fas fa-minus-circle"></i>',
            'COLLECT_FEES': '<i class="fas fa-coins"></i>',
            'INITIALIZE_POOL': '<i class="fas fa-rocket"></i>',
            'UNKNOWN': '<i class="fas fa-question-circle"></i>'
        };
        
        return icons[type] || icons['UNKNOWN'];
    }

    // Display positions
    displayPositions(positions) {
        if (!positions || positions.length === 0) return;
        
        const resultsDiv = document.getElementById('monitoringResults');
        const positionsHtml = `
            <h3>Current Liquidity Positions</h3>
            <div class="positions-grid">
                ${positions.map(pos => `
                    <div class="position-card">
                        <div class="position-header">
                            <span class="position-protocol">${pos.protocol}</span>
                            <span class="position-pool">${pos.pool}</span>
                        </div>
                        <div class="position-value">
                            ${uiManager.formatCurrency(pos.balance)}
                        </div>
                        <div class="position-status ${pos.inRange ? 'in-range' : 'out-range'}">
                            ${pos.inRange ? 'In Range' : 'Out of Range'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        resultsDiv.innerHTML += positionsHtml;
    }

    // Display real-time transaction
    displayRealtimeTransaction(tx) {
        const resultsDiv = document.getElementById('monitoringResults');
        
        // Create notification
        showNotification(`New ${tx.type} transaction detected!`, 'info');
        
        // Add to top of results
        const txCard = document.createElement('div');
        txCard.innerHTML = this.createTransactionCard(tx);
        txCard.classList.add('fade-in', 'new-transaction');
        
        resultsDiv.insertBefore(txCard, resultsDiv.firstChild);
        
        // Remove old transactions if too many
        const cards = resultsDiv.querySelectorAll('.transaction-card');
        if (cards.length > 20) {
            cards[cards.length - 1].remove();
        }
    }

    // Display real-time status
    displayRealtimeStatus(active) {
        const resultsDiv = document.getElementById('monitoringResults');
        
        if (active) {
            resultsDiv.innerHTML = `
                <div class="realtime-status active">
                    <i class="fas fa-circle"></i> Real-time monitoring active
                    <div class="pulse"></div>
                </div>
                <div id="realtimeTransactions"></div>
            `;
        } else {
            const statusDiv = resultsDiv.querySelector('.realtime-status');
            if (statusDiv) {
                statusDiv.classList.remove('active');
                statusDiv.innerHTML = '<i class="fas fa-circle"></i> Real-time monitoring stopped';
            }
        }
    }

    // Display account update
    displayAccountUpdate(accountData) {
        console.log('Account update:', accountData);
        // Handle account updates (position changes, etc.)
    }

    // Update transaction history
    updateTransactionHistory(transactions) {
        const historyDiv = document.getElementById('transactionList');
        
        historyDiv.innerHTML = `
            <table class="transaction-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Details</th>
                        <th>Status</th>
                        <th>Link</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.slice(0, 20).map(tx => `
                        <tr>
                            <td>${new Date(tx.timestamp * 1000).toLocaleTimeString()}</td>
                            <td>${tx.type}</td>
                            <td>${this.getTransactionSummary(tx)}</td>
                            <td class="${tx.status}">${tx.status}</td>
                            <td>
                                <a href="https://solscan.io/tx/${tx.signature}" target="_blank">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Get transaction summary
    getTransactionSummary(tx) {
        if (tx.type === 'SWAP' && tx.details.swapIn && tx.details.swapOut) {
            const swapIn = Object.values(tx.details.swapIn)[0];
            const swapOut = Object.values(tx.details.swapOut)[0];
            return `${swapIn?.amount?.toFixed(2)} ${swapIn?.symbol} → ${swapOut?.amount?.toFixed(2)} ${swapOut?.symbol}`;
        }
        
        if (tx.pool && tx.pool.tokens) {
            return tx.pool.tokens.map(t => t.symbol).join('/');
        }
        
        return '-';
    }

    // Display error
    displayError(message) {
        const resultsDiv = document.getElementById('monitoringResults');
        resultsDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
    }

    // Clear results
    clearResults() {
        document.getElementById('monitoringResults').innerHTML = '';
        document.getElementById('transactionHistory').style.display = 'none';
    }

    // Stop monitoring
    stopMonitoring() {
        this.stopAllMonitors();
        this.displayRealtimeStatus(false);
        showNotification('Monitoring stopped', 'info');
    }

    // Stop all monitors
    stopAllMonitors() {
        poolMonitor.closeAllConnections();
        this.activeMonitors.clear();
    }
}

// Create global instance
const poolMonitorUI = new PoolMonitorUI();

// Global functions for onclick events
function startMonitoring() {
    poolMonitorUI.startMonitoring();
}

function stopMonitoring() {
    poolMonitorUI.stopMonitoring();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    poolMonitorUI.initializeUI();
}); 