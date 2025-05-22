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
                    </tr>
                </table>
            `;
            container.appendChild(poolElement);
        });
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