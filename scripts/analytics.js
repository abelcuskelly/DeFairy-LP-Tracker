// DeFairy Analytics Dashboard
// Provides historical P&L tracking and performance analytics

class AnalyticsDashboard {
    constructor() {
        this.isVisible = false;
        this.currentWallet = null;
        this.analyticsData = null;
    }

    async initialize() {
        this.createDashboardHTML();
        this.attachEventListeners();
        console.log('📊 Analytics Dashboard initialized');
    }

    createDashboardHTML() {
        const dashboardHTML = `
            <div id="analyticsDashboard" class="analytics-dashboard" style="display: none;">
                <div class="analytics-header">
                    <h2><i class="fas fa-chart-line"></i> Performance Analytics</h2>
                    <button class="close-btn" onclick="analyticsDashboard.hide()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="analytics-content">
                    <div class="analytics-tabs">
                        <button class="tab-btn active" data-tab="overview">Overview</button>
                        <button class="tab-btn" data-tab="positions">Positions</button>
                        <button class="tab-btn" data-tab="historical">Historical</button>
                        <button class="tab-btn" data-tab="alerts">Alerts</button>
                    </div>
                    
                    <div class="tab-content">
                        <!-- Overview Tab -->
                        <div id="overview-tab" class="tab-panel active">
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <h3>Total Portfolio Value</h3>
                                    <div class="metric-value" id="totalValue">$0.00</div>
                                    <div class="metric-change" id="totalValueChange">+0.00%</div>
                                </div>
                                <div class="metric-card">
                                    <h3>Total P&L (24h)</h3>
                                    <div class="metric-value" id="totalPL24h">$0.00</div>
                                    <div class="metric-change" id="totalPL24hChange">+0.00%</div>
                                </div>
                                <div class="metric-card">
                                    <h3>Total Fees Earned</h3>
                                    <div class="metric-value" id="totalFees">$0.00</div>
                                    <div class="metric-change" id="totalFeesChange">+0.00%</div>
                                </div>
                                <div class="metric-card">
                                    <h3>Active Positions</h3>
                                    <div class="metric-value" id="activePositions">0</div>
                                    <div class="metric-change" id="positionsChange">0</div>
                                </div>
                            </div>
                            
                            <div class="chart-container">
                                <canvas id="portfolioChart" width="800" height="400"></canvas>
                            </div>
                        </div>
                        
                        <!-- Positions Tab -->
                        <div id="positions-tab" class="tab-panel">
                            <div class="positions-analytics">
                                <div class="position-filters">
                                    <select id="positionFilter">
                                        <option value="all">All Positions</option>
                                        <option value="orca">Orca Only</option>
                                        <option value="raydium">Raydium Only</option>
                                        <option value="profitable">Profitable Only</option>
                                        <option value="losing">Losing Only</option>
                                    </select>
                                    <select id="timePeriodFilter">
                                        <option value="24h">24 Hours</option>
                                        <option value="7d">7 Days</option>
                                        <option value="30d">30 Days</option>
                                    </select>
                                </div>
                                
                                <div class="positions-list" id="positionsAnalyticsList">
                                    <!-- Position analytics will be populated here -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Historical Tab -->
                        <div id="historical-tab" class="tab-panel">
                            <div class="historical-controls">
                                <select id="historicalPeriod">
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="90d">Last 90 Days</option>
                                </select>
                                <button id="exportDataBtn" class="btn btn-secondary">
                                    <i class="fas fa-download"></i> Export Data
                                </button>
                            </div>
                            
                            <div class="historical-chart">
                                <canvas id="historicalChart" width="800" height="400"></canvas>
                            </div>
                            
                            <div class="historical-table">
                                <table id="historicalTable">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Portfolio Value</th>
                                            <th>P&L</th>
                                            <th>Fees Earned</th>
                                            <th>Positions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historicalTableBody">
                                        <!-- Historical data will be populated here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Alerts Tab -->
                        <div id="alerts-tab" class="tab-panel">
                            <div class="alerts-controls">
                                <button id="markAllReadBtn" class="btn btn-secondary">
                                    <i class="fas fa-check"></i> Mark All Read
                                </button>
                                <button id="clearAlertsBtn" class="btn btn-danger">
                                    <i class="fas fa-trash"></i> Clear All
                                </button>
                            </div>
                            
                            <div class="alerts-list" id="alertsList">
                                <!-- Alerts will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Position filters
        document.getElementById('positionFilter')?.addEventListener('change', () => {
            this.updatePositionsAnalytics();
        });

        document.getElementById('timePeriodFilter')?.addEventListener('change', () => {
            this.updatePositionsAnalytics();
        });

        // Historical controls
        document.getElementById('historicalPeriod')?.addEventListener('change', () => {
            this.updateHistoricalData();
        });

        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // Alert controls
        document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
            this.markAllAlertsRead();
        });

        document.getElementById('clearAlertsBtn')?.addEventListener('click', () => {
            this.clearAllAlerts();
        });
    }

    async show(walletAddress) {
        this.currentWallet = walletAddress;
        this.isVisible = true;
        
        document.getElementById('analyticsDashboard').style.display = 'block';
        
        // Load analytics data
        await this.loadAnalyticsData();
        
        // Update all tabs
        this.updateOverview();
        this.updatePositionsAnalytics();
        this.updateHistoricalData();
        this.updateAlerts();
        
        console.log('📊 Analytics Dashboard opened for wallet:', walletAddress);
    }

    hide() {
        this.isVisible = false;
        document.getElementById('analyticsDashboard').style.display = 'none';
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadAnalyticsData() {
        if (!this.currentWallet || !window.databaseService?.isInitialized) {
            console.warn('Cannot load analytics data: missing wallet or database service');
            return;
        }

        try {
            // Load user positions from database
            const positions = await window.databaseService.getUserPositions(this.currentWallet);
            
            // Calculate analytics
            this.analyticsData = this.calculateAnalytics(positions);
            
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }

    calculateAnalytics(positions) {
        if (!positions || positions.length === 0) {
            return {
                totalValue: 0,
                totalPL24h: 0,
                totalFees: 0,
                activePositions: 0,
                positions: []
            };
        }

        let totalValue = 0;
        let totalPL24h = 0;
        let totalFees = 0;
        let activePositions = 0;

        const processedPositions = positions.map(position => {
            const value = parseFloat(position.total_value_usd) || 0;
            const pl24h = parseFloat(position.pl24h) || 0;
            const fees = parseFloat(position.fees_earned) || 0;

            totalValue += value;
            totalPL24h += pl24h;
            totalFees += fees;
            if (value > 0) activePositions++;

            return {
                ...position,
                value,
                pl24h,
                fees,
                returnPercent: value > 0 ? (pl24h / value) * 100 : 0
            };
        });

        return {
            totalValue,
            totalPL24h,
            totalFees,
            activePositions,
            positions: processedPositions
        };
    }

    updateOverview() {
        if (!this.analyticsData) return;

        const { totalValue, totalPL24h, totalFees, activePositions } = this.analyticsData;

        document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('totalPL24h').textContent = `$${totalPL24h.toFixed(2)}`;
        document.getElementById('totalFees').textContent = `$${totalFees.toFixed(2)}`;
        document.getElementById('activePositions').textContent = activePositions.toString();

        // Update change indicators
        const totalValueChange = totalValue > 0 ? (totalPL24h / totalValue) * 100 : 0;
        document.getElementById('totalValueChange').textContent = `${totalValueChange >= 0 ? '+' : ''}${totalValueChange.toFixed(2)}%`;
        document.getElementById('totalValueChange').className = `metric-change ${totalValueChange >= 0 ? 'positive' : 'negative'}`;

        // Update portfolio chart
        this.updatePortfolioChart();
    }

    updatePortfolioChart() {
        const canvas = document.getElementById('portfolioChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Simple chart implementation (you might want to use Chart.js for better charts)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a simple line chart showing portfolio value over time
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Mock data for demonstration
        const dataPoints = 30;
        const maxValue = this.analyticsData.totalValue * 1.2;
        
        for (let i = 0; i < dataPoints; i++) {
            const x = (i / (dataPoints - 1)) * canvas.width;
            const y = canvas.height - ((Math.random() * 0.4 + 0.8) * canvas.height);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }

    async updatePositionsAnalytics() {
        if (!this.analyticsData) return;

        const filter = document.getElementById('positionFilter')?.value || 'all';
        const timePeriod = document.getElementById('timePeriodFilter')?.value || '24h';
        
        let filteredPositions = this.analyticsData.positions;

        // Apply filters
        if (filter === 'orca') {
            filteredPositions = filteredPositions.filter(p => p.pools?.dex_name === 'orca');
        } else if (filter === 'raydium') {
            filteredPositions = filteredPositions.filter(p => p.pools?.dex_name === 'raydium');
        } else if (filter === 'profitable') {
            filteredPositions = filteredPositions.filter(p => p.pl24h > 0);
        } else if (filter === 'losing') {
            filteredPositions = filteredPositions.filter(p => p.pl24h < 0);
        }

        // Render positions
        const container = document.getElementById('positionsAnalyticsList');
        if (!container) return;

        container.innerHTML = filteredPositions.map(position => `
            <div class="position-analytics-item">
                <div class="position-header">
                    <h4>${position.pools?.token0_symbol || 'Unknown'}/${position.pools?.token1_symbol || 'Unknown'}</h4>
                    <span class="position-dex">${position.pools?.dex_name?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                <div class="position-metrics">
                    <div class="metric">
                        <span class="label">Value:</span>
                        <span class="value">$${position.value.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="label">P&L (${timePeriod}):</span>
                        <span class="value ${position.pl24h >= 0 ? 'positive' : 'negative'}">$${position.pl24h.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Return:</span>
                        <span class="value ${position.returnPercent >= 0 ? 'positive' : 'negative'}">${position.returnPercent.toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Fees:</span>
                        <span class="value">$${position.fees.toFixed(2)}</span>
                    </div>
                </div>
                <div class="position-status">
                    <span class="status ${position.in_range ? 'in-range' : 'out-of-range'}">
                        ${position.in_range ? 'In Range' : 'Out of Range'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    async updateHistoricalData() {
        if (!this.currentWallet || !window.databaseService?.isInitialized) return;

        try {
            const period = document.getElementById('historicalPeriod')?.value || '30d';
            const days = parseInt(period.replace('d', ''));
            
            // Get historical data from database
            const historicalData = await this.getHistoricalData(days);
            
            // Update historical chart
            this.updateHistoricalChart(historicalData);
            
            // Update historical table
            this.updateHistoricalTable(historicalData);
            
        } catch (error) {
            console.error('Error updating historical data:', error);
        }
    }

    async getHistoricalData(days) {
        // This would typically fetch from position_snapshots table
        // For now, return mock data
        const data = [];
        const now = new Date();
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                portfolioValue: this.analyticsData.totalValue * (0.95 + Math.random() * 0.1),
                pl: (Math.random() - 0.5) * 100,
                fees: Math.random() * 10,
                positions: this.analyticsData.activePositions
            });
        }
        
        return data;
    }

    updateHistoricalChart(data) {
        const canvas = document.getElementById('historicalChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw historical chart
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const maxValue = Math.max(...data.map(d => d.portfolioValue));
        const minValue = Math.min(...data.map(d => d.portfolioValue));
        const range = maxValue - minValue || 1;
        
        data.forEach((point, index) => {
            const x = (index / (data.length - 1)) * canvas.width;
            const y = canvas.height - ((point.portfolioValue - minValue) / range) * canvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    updateHistoricalTable(data) {
        const tbody = document.getElementById('historicalTableBody');
        if (!tbody) return;

        tbody.innerHTML = data.map(point => `
            <tr>
                <td>${point.date}</td>
                <td>$${point.portfolioValue.toFixed(2)}</td>
                <td class="${point.pl >= 0 ? 'positive' : 'negative'}">$${point.pl.toFixed(2)}</td>
                <td>$${point.fees.toFixed(2)}</td>
                <td>${point.positions}</td>
            </tr>
        `).join('');
    }

    async updateAlerts() {
        if (!this.currentWallet || !window.databaseService?.isInitialized) return;

        try {
            const alerts = await window.databaseService.getUserAlerts(this.currentWallet);
            
            const container = document.getElementById('alertsList');
            if (!container) return;

            container.innerHTML = alerts.map(alert => `
                <div class="alert-item ${alert.severity} ${alert.is_read ? 'read' : 'unread'}">
                    <div class="alert-header">
                        <span class="alert-type">${alert.alert_type.replace('_', ' ').toUpperCase()}</span>
                        <span class="alert-severity">${alert.severity.toUpperCase()}</span>
                        <span class="alert-time">${new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                    <div class="alert-message">${alert.alert_message}</div>
                    <div class="alert-actions">
                        <button class="btn btn-sm" onclick="analyticsDashboard.markAlertRead('${alert.id}')">
                            Mark Read
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error updating alerts:', error);
        }
    }

    async markAlertRead(alertId) {
        // Implementation for marking individual alert as read
        console.log('Marking alert as read:', alertId);
    }

    async markAllAlertsRead() {
        // Implementation for marking all alerts as read
        console.log('Marking all alerts as read');
    }

    async clearAllAlerts() {
        // Implementation for clearing all alerts
        console.log('Clearing all alerts');
    }

    exportData() {
        if (!this.analyticsData) return;

        const exportData = {
            wallet: this.currentWallet,
            timestamp: new Date().toISOString(),
            analytics: this.analyticsData
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `defairy-analytics-${this.currentWallet}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Analytics data exported successfully!', 'success');
    }
}

// Global analytics dashboard instance
window.analyticsDashboard = new AnalyticsDashboard();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analyticsDashboard.initialize();
    });
} else {
    window.analyticsDashboard.initialize();
}
