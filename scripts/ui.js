// UI management and helper functions
class UIManager {
    constructor() {
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.currentPools = [];
    }

    // Format currency values
    formatCurrency(value, decimals = 2) {
        if (typeof value !== 'number') return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    // Format percentage values
    formatPercentage(value, decimals = 1) {
        if (typeof value !== 'number') return '0.0%';
        return `${value.toFixed(decimals)}%`;
    }

    // Update portfolio statistics
    updatePortfolioStats(metrics) {
        document.getElementById('totalBalance').textContent = this.formatCurrency(metrics.totalBalance);
        document.getElementById('profitLoss').textContent = this.formatCurrency(metrics.totalPL24h);
        document.getElementById('avgApy').textContent = this.formatPercentage(metrics.avgAPY);
        document.getElementById('feesHarvested').textContent = this.formatCurrency(metrics.totalFeesToday);
        
        // Update out of range display
        document.getElementById('outOfRange').textContent = `${metrics.outOfRangePools} / ${metrics.totalPools}`;
        const outOfRangePercent = metrics.totalPools > 0 ? 
            ((metrics.outOfRangePools / metrics.totalPools) * 100).toFixed(1) : 0;
        document.getElementById('outOfRangeLabel').textContent = `Out of Range (${outOfRangePercent}%)`;
        
        // Update location breakdown
        this.updateLocationBreakdown(metrics.pools);
        
        // Store pools for sorting
        this.currentPools = metrics.pools;
    }

    // Get URL for DEX location
    getDexUrl(location) {
        const dexUrls = {
            'orca': 'https://www.orca.so/portfolio',
            'raydium': 'https://raydium.io/liquidity-pools/',
            'meteora': 'https://app.meteora.ag/pools',
            'drift': 'https://app.drift.trade/pools',
            'jupiter': 'https://jup.ag/swap'
        };
        
        // Return URL or default to a generic Solana explorer if DEX is unknown
        return dexUrls[location.toLowerCase()] || 'https://explorer.solana.com';
    }

    // Update location breakdown
    updateLocationBreakdown(pools) {
        const locations = {};
        
        pools.forEach(pool => {
            // Use the pool's actual location property, with fallback to simple detection
            const location = pool.location || (pool.pool.includes('SOL') ? 'Orca' : 'Raydium');
            if (!locations[location]) {
                locations[location] = { balance: 0, count: 0 };
            }
            locations[location].balance += pool.balance;
            locations[location].count += 1;
        });
        
        const locationHTML = Object.entries(locations).map(([name, data]) => {
            // Use the getDexUrl helper for consistent URL mapping
            const url = this.getDexUrl(name);
            return `<a href="${url}" class="location-link" target="_blank">${name}</a>: ${this.formatCurrency(data.balance)} (${data.count} pools)`;
        }).join('<br>');
        
        document.getElementById('locationsBreakdown').innerHTML = locationHTML;
    }

    // Render pools table
    renderPools(pools = this.currentPools) {
        const container = document.getElementById('poolsContainer');
        
        if (!pools || pools.length === 0) {
            container.innerHTML = `
                <div class="loading-pools">
                    <div class="loading"></div>
                    <span>No pools found. Connect wallet or enter address to view pools</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        pools.forEach((pool, index) => {
            // Determine pool location with more reliable method
            const location = pool.location || (pool.pool.includes('SOL') ? 'Orca' : 'Raydium');
            
            const poolElement = document.createElement('div');
            poolElement.className = 'pool-row fade-in';
            poolElement.setAttribute('data-pool-address', pool.address || `pool-${index}`);
            poolElement.innerHTML = `
                <table>
                    <tr>
                        <td>
                            <div class="token-pair">
                                <i class="fas fa-coins"></i>
                                ${pool.pool}
                            </div>
                        </td>
                        <td><strong>${this.formatCurrency(pool.balance)}</strong></td>
                        <td><span class="${pool.pl24h >= 0 ? 'success' : 'error'}">${this.formatCurrency(pool.pl24h, 2)}</span></td>
                        <td>${this.formatPercentage(pool.apy24h)}</td>
                        <td><span class="success">${this.formatCurrency(pool.feesEarned)}</span></td>
                        <td><span class="${pool.inRange ? 'in-range' : 'out-range'}">${pool.inRange ? 'In Range' : 'Out of Range'}</span></td>
                        <td>
                            <a href="${this.getDexUrl(location)}" 
                               class="location-link" target="_blank">
                               ${location}
                            </a>
                        </td>
                        <td class="rebalance-cell">
                            <!-- Will be populated by updatePoolRebalancingUI() -->
                        </td>
                    </tr>
                </table>
            `;
            container.appendChild(poolElement);
        });
        
        // Update rebalancing toggles after rendering
        if (window.updatePoolRebalancingUI) {
            window.updatePoolRebalancingUI();
        }
    }

    // Sort pools by column
    sortPools(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        const sorted = [...this.currentPools].sort((a, b) => {
            let valueA, valueB;
            
            switch (column) {
                case 'pool':
                    valueA = a.pool;
                    valueB = b.pool;
                    break;
                case 'balance':
                    valueA = a.balance;
                    valueB = b.balance;
                    break;
                case 'pl24h':
                    valueA = a.pl24h;
                    valueB = b.pl24h;
                    break;
                case 'apy24h':
                    valueA = a.apy24h;
                    valueB = b.apy24h;
                    break;
                case 'fees24h':
                    valueA = a.feesEarned;
                    valueB = b.feesEarned;
                    break;
                case 'status':
                    valueA = a.inRange ? 1 : 0;
                    valueB = b.inRange ? 1 : 0;
                    break;
                default:
                    return 0;
            }
            
            if (typeof valueA === 'string') {
                return this.sortDirection === 'asc' ? 
                    valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
            } else {
                return this.sortDirection === 'asc' ? 
                    valueA - valueB : valueB - valueA;
            }
        });
        
        this.updateSortIndicators(column);
        this.renderPools(sorted);
    }

    // Update sort indicators in table headers
    updateSortIndicators(activeColumn) {
        document.querySelectorAll('.pool-table th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const activeHeader = document.querySelector(`[onclick="sortPools('${activeColumn}')"]`);
        if (activeHeader) {
            activeHeader.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    // Toggle expandable sections
    toggleExpandable(id) {
        const element = document.getElementById(id);
        element.classList.toggle('open');
    }

    // AI Assistant functions
    toggleAI() {
        const aiChat = document.getElementById('aiChat');
        aiChat.classList.toggle('open');
    }

    async sendAIMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        const chatBody = document.getElementById('aiChatBody');
        
        // Add user message
        const userMessage = document.createElement('div');
        userMessage.className = 'user-message';
        userMessage.textContent = message;
        chatBody.appendChild(userMessage);
        
        // Clear input and scroll
        input.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;
        
        try {
            // Get response from OpenAI
            const aiResponse = await openAIManager.generateResponse(message);
            
            // Add AI response to the chat
            const aiMessage = document.createElement('div');
            aiMessage.className = 'ai-message';
            aiMessage.textContent = aiResponse;
            chatBody.appendChild(aiMessage);
        } catch (error) {
            // Handle errors
            const aiMessage = document.createElement('div');
            aiMessage.className = 'ai-message error';
            aiMessage.textContent = "Sorry, I'm having trouble connecting right now. Please try again later. 🧚‍♀️";
            chatBody.appendChild(aiMessage);
            console.error('Error getting AI response:', error);
        }
        
        // Scroll to bottom after adding message
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Fallback AI response if OpenAI is not available
    getAIResponse(message) {
        const responses = {
            rebalance: "I recommend rebalancing your out-of-range pools. Your USDT/USDC position could benefit from adjusting the price range.",
            optimize: "To optimize yields, consider concentrating liquidity in tighter ranges for stable pairs and wider ranges for volatile pairs.",
            fees: "Your fee earnings are performing well! The SOL/USDC pool is generating the highest fees due to good trading volume.",
            apy: "Your average APY of 14.8% is above market average. Consider adding more capital to your best-performing pools.",
            default: "I'm here to help with your DeFi strategy! Ask me about rebalancing, optimization, fees, or APY calculations."
        };
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('rebalance')) return responses.rebalance;
        if (lowerMessage.includes('optimize') || lowerMessage.includes('yield')) return responses.optimize;
        if (lowerMessage.includes('fee')) return responses.fees;
        if (lowerMessage.includes('apy') || lowerMessage.includes('return')) return responses.apy;
        
        return responses.default;
    }
    
    // Update auto-rebalancing button state
    updateRebalancingButtonState(isEnabled) {
        const button = document.getElementById('rebalanceToggleBtn');
        if (!button) return;
        
        if (isEnabled) {
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Auto-Rebalancing Active';
        } else {
            button.classList.remove('active');
            button.innerHTML = '<i class="fas fa-sync-alt"></i> Enable Auto-Rebalancing';
        }
    }
    
    // Toggle auto-rebalancing functionality
    async toggleAutoRebalancing() {
        try {
            const button = document.getElementById('rebalanceToggleBtn');
            const isCurrentlyEnabled = button.classList.contains('active');
            const walletAddress = document.getElementById('walletInput').value;
            
            if (!walletAddress) {
                showNotification('Please connect your wallet or enter an address first', 'warning');
                return;
            }
            
            // Toggle the state
            const newState = !isCurrentlyEnabled;
            
            // Update UI to show processing
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Call API to toggle auto-rebalancing
            const success = await apiManager.toggleAutoRebalancing(walletAddress, newState);
            
            if (success) {
                // Update button state
                this.updateRebalancingButtonState(newState);
                
                // If enabling, check for rebalancing opportunities
                if (newState) {
                    this.checkRebalancingOpportunities();
                }
            }
            
            // Re-enable button
            button.disabled = false;
        } catch (error) {
            console.error('Error toggling auto-rebalancing:', error);
            showNotification('Failed to toggle auto-rebalancing: ' + error.message, 'error');
            
            // Reset button state
            const button = document.getElementById('rebalanceToggleBtn');
            button.disabled = false;
            this.updateRebalancingButtonState(false);
        }
    }
    
    // Check for rebalancing opportunities
    async checkRebalancingOpportunities() {
        try {
            const walletAddress = document.getElementById('walletInput').value;
            
            if (!walletAddress) return;
            
            // Get current positions
            const positions = await apiManager.getUserPositions(walletAddress);
            
            // Get rebalancing recommendations
            const recommendations = await apiManager.getRebalancingRecommendations(positions);
            
            if (recommendations.recommendations.length > 0) {
                // Show recommendations
                this.displayRebalancingRecommendations(recommendations);
            }
        } catch (error) {
            console.error('Error checking rebalancing opportunities:', error);
        }
    }
    
    // Display rebalancing recommendations
    displayRebalancingRecommendations(recommendations) {
        try {
            const container = document.getElementById('rebalancingRecommendations');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (recommendations.recommendations.length === 0) {
                container.innerHTML = '<p>No rebalancing opportunities found.</p>';
                return;
            }
            
            // Create header
            const header = document.createElement('div');
            header.className = 'recommendations-header';
            header.innerHTML = `<h3>${recommendations.message}</h3>`;
            container.appendChild(header);
            
            // Create recommendations list
            const list = document.createElement('div');
            list.className = 'recommendations-list';
            
            recommendations.recommendations.forEach(rec => {
                const item = document.createElement('div');
                item.className = 'recommendation-item';
                
                let detailsHtml = '';
                if (rec.currentTick !== undefined) {
                    detailsHtml = `
                        <div class="recommendation-details">
                            <p>Current tick: ${rec.currentTick}</p>
                            <p>Current range: ${rec.lowerTick} to ${rec.upperTick}</p>
                            <p>Recommended range: ${rec.newLowerTick} to ${rec.newUpperTick}</p>
                            <p>Estimated APY improvement: +${(rec.estimatedAPY - rec.apy24h).toFixed(1)}%</p>
                        </div>
                    `;
                }
                
                let actionButton = '';
                if (rec.location.toLowerCase() === 'orca') {
                    actionButton = `
                        <button onclick="executeRebalance('${rec.positionAddress}', ${rec.newLowerTick}, ${rec.newUpperTick})" class="action-button">
                            Rebalance Now
                        </button>
                    `;
                }
                
                item.innerHTML = `
                    <div class="recommendation-header">
                        <h4>${rec.pool} (${rec.location})</h4>
                        <span class="recommendation-reason">${rec.reason}</span>
                    </div>
                    <p>${rec.recommendation}</p>
                    ${detailsHtml}
                    ${actionButton}
                `;
                
                list.appendChild(item);
            });
            
            container.appendChild(list);
            
            // Show the container
            container.style.display = 'block';
        } catch (error) {
            console.error('Error displaying rebalancing recommendations:', error);
        }
    }
    
    // Execute rebalancing for a position
    async executeRebalance(positionAddress, newLowerTick, newUpperTick) {
        try {
            const walletAddress = document.getElementById('walletInput').value;
            
            if (!walletAddress) {
                showNotification('Please connect your wallet or enter an address first', 'warning');
                return;
            }
            
            // In a real implementation, get the wallet from a connected wallet adapter
            const wallet = null; // Would be an actual wallet in production
            
            // Call API to execute rebalancing
            const success = await apiManager.executeRebalance(positionAddress, newLowerTick, newUpperTick, wallet);
            
            if (success) {
                showNotification('Rebalancing executed successfully!', 'success');
                
                // Refresh positions
                const positions = await apiManager.getUserPositions(walletAddress);
                const metrics = apiManager.calculatePortfolioMetrics(positions);
                this.updatePortfolioStats(metrics);
                this.renderPools(metrics.pools);
                
                // Clear recommendations
                const container = document.getElementById('rebalancingRecommendations');
                if (container) {
                    container.innerHTML = '';
                    container.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error executing rebalance:', error);
            showNotification('Failed to execute rebalancing: ' + error.message, 'error');
        }
    }
}

// Global UI manager instance
const uiManager = new UIManager();

// Global functions for onclick events
function toggleExpandable(id) {
    uiManager.toggleExpandable(id);
}

function sortPools(column) {
    uiManager.sortPools(column);
}

function toggleAI() {
    uiManager.toggleAI();
}

function sendAIMessage() {
    uiManager.sendAIMessage();
}

function toggleAutoRebalancing() {
    uiManager.toggleAutoRebalancing();
}

function executeRebalance(positionAddress, newLowerTick, newUpperTick) {
    uiManager.executeRebalance(positionAddress, newLowerTick, newUpperTick);
}

// Handle Enter key in AI input
document.addEventListener('DOMContentLoaded', function() {
    const aiInput = document.getElementById('aiInput');
    if (aiInput) {
        aiInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendAIMessage();
            }
        });
    }
});

// Configure notification settings
function configureNotifications() {
    const currentSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    
    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Notification Settings</h2>
                <button onclick="this.closest('.notification-modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="notification-option">
                    <label>
                        <input type="checkbox" id="telegramEnabled" ${currentSettings.telegram?.enabled ? 'checked' : ''}>
                        Enable Telegram Notifications
                    </label>
                    <input type="text" id="telegramChatId" placeholder="Enter Telegram Chat ID" 
                           value="${currentSettings.telegram?.chatId || ''}" 
                           style="display: ${currentSettings.telegram?.enabled ? 'block' : 'none'}">
                </div>
                <div class="notification-option">
                    <label>
                        <input type="checkbox" id="emailEnabled" ${currentSettings.email?.enabled ? 'checked' : ''}>
                        Enable Email Notifications
                    </label>
                    <input type="email" id="emailAddress" placeholder="Enter email address" 
                           value="${currentSettings.email?.address || ''}"
                           style="display: ${currentSettings.email?.enabled ? 'block' : 'none'}">
                </div>
                <div class="notification-option">
                    <label>
                        <input type="checkbox" id="inAppEnabled" ${currentSettings.inApp?.enabled !== false ? 'checked' : ''}>
                        Enable In-App Notifications
                    </label>
                </div>
                <div class="threshold-settings">
                    <h3>Alert Thresholds</h3>
                    <div class="threshold-option">
                        <label>Imbalance Ratio Alert (%):</label>
                        <input type="number" id="imbalanceThreshold" min="10" max="50" value="25">
                    </div>
                    <div class="threshold-option">
                        <label>Price Deviation Alert (%):</label>
                        <input type="number" id="priceThreshold" min="1" max="20" value="5">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveNotificationSettings()">Save Settings</button>
                <button class="btn btn-secondary" onclick="this.closest('.notification-modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Toggle input visibility
    document.getElementById('telegramEnabled').addEventListener('change', (e) => {
        document.getElementById('telegramChatId').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('emailEnabled').addEventListener('change', (e) => {
        document.getElementById('emailAddress').style.display = e.target.checked ? 'block' : 'none';
    });
}

// Save notification settings
function saveNotificationSettings() {
    const settings = {
        telegram: {
            enabled: document.getElementById('telegramEnabled').checked,
            chatId: document.getElementById('telegramChatId').value
        },
        email: {
            enabled: document.getElementById('emailEnabled').checked,
            address: document.getElementById('emailAddress').value
        },
        inApp: {
            enabled: document.getElementById('inAppEnabled').checked
        }
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    // Update global notification settings
    if (window.notificationSettings) {
        window.notificationSettings = settings;
    }
    
    showNotification('Notification settings saved!', 'success');
    document.querySelector('.notification-modal').remove();
} 