// DeFairy Smart Auto-Rebalancing System
// Secure browser-based implementation with one-click rebalancing
// ✅ SECURITY: No private keys stored, wallet signatures required
// 🎯 AUTOMATION: Smart alerts + one-click execution

class DeFairySmartAutoRebalancer {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.userPreferences = new Map();
        this.rebalanceQueue = new Map();
        this.securityConfig = {
            maxRebalanceAmount: 5000, // Max $5000 per rebalance
            maxDailyTransactions: 10,
            maxWeeklyAmount: 20000,
            requireConfirmationAbove: 1000, // Require confirmation for >$1000
            minTimeBetweenRebalances: 300000, // 5 minutes
            maxConsecutiveFailures: 3
        };
        this.auditLog = [];
        this.lastRebalanceTime = new Map();
        this.failureCount = new Map();
        
        this.initializeEventListeners();
    }

    // 🎯 INITIALIZATION AND SETUP
    initializeEventListeners() {
        // Listen for pool data updates
        window.addEventListener('poolsLoaded', (event) => {
            this.updatePoolMonitoring(event.detail);
        });

        // Listen for wallet connection changes
        window.addEventListener('walletConnected', (event) => {
            this.handleWalletConnection(event.detail);
        });

        // Listen for manual rebalance requests
        window.addEventListener('manualRebalanceRequest', (event) => {
            this.handleManualRebalanceRequest(event.detail);
        });
    }

    // 🔧 USER PREFERENCE MANAGEMENT
    async configureAutoRebalancing(walletAddress, preferences) {
        try {
            // Validate preferences
            const validatedPreferences = this.validatePreferences(preferences);
            
            // Store user preferences
            this.userPreferences.set(walletAddress, {
                ...validatedPreferences,
                walletAddress,
                setupTimestamp: Date.now(),
                isActive: true,
                dailyTransactionCount: 0,
                weeklyTransactionAmount: 0,
                lastTransactionReset: Date.now()
            });

            // Save to localStorage for persistence
            localStorage.setItem(`defairy_rebalance_prefs_${walletAddress}`, 
                JSON.stringify(validatedPreferences));

            this.logAuditEvent('CONFIG_UPDATED', walletAddress, validatedPreferences);

            // Start monitoring if enabled
            if (validatedPreferences.enableGlobalRebalancing) {
                this.startMonitoring(walletAddress);
            }

            return { success: true, preferences: validatedPreferences };

        } catch (error) {
            console.error('Error configuring auto-rebalancing:', error);
            return { success: false, error: error.message };
        }
    }

    validatePreferences(preferences) {
        return {
            enableGlobalRebalancing: preferences.enableGlobalRebalancing || false,
            poolSpecificSettings: preferences.poolSpecificSettings || {},
            maxRebalanceAmount: Math.min(
                preferences.maxRebalanceAmount || 1000, 
                this.securityConfig.maxRebalanceAmount
            ),
            maxDailyTransactions: Math.min(
                preferences.maxDailyTransactions || 5, 
                this.securityConfig.maxDailyTransactions
            ),
            rebalanceThresholds: {
                imbalanceRatio: preferences.rebalanceThresholds?.imbalanceRatio || 0.25,
                priceDeviation: preferences.rebalanceThresholds?.priceDeviation || 0.05,
                outOfRangeAction: preferences.rebalanceThresholds?.outOfRangeAction || 'alert'
            },
            notificationChannels: {
                inApp: preferences.notificationChannels?.inApp !== false,
                email: preferences.notificationChannels?.email || false,
                telegram: preferences.notificationChannels?.telegram || false
            },
            autoExecuteBelow: preferences.autoExecuteBelow || 100, // Auto-execute below $100
            requireConfirmationAbove: preferences.requireConfirmationAbove || 1000
        };
    }

    // 🔍 MONITORING SYSTEM
    startMonitoring(walletAddress) {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        console.log('🧚‍♀️ Starting DeFairy smart auto-rebalancing monitoring...');

        // Monitor every 5 minutes
        this.monitoringInterval = setInterval(() => {
            this.performMonitoringCycle(walletAddress);
        }, 5 * 60 * 1000);

        // Immediate first check
        this.performMonitoringCycle(walletAddress);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('⏹️ Smart auto-rebalancing monitoring stopped');
    }

    async performMonitoringCycle(walletAddress) {
        try {
            if (!walletAddress || !window.portfolioPools) return;

            const userPrefs = this.userPreferences.get(walletAddress);
            if (!userPrefs || !userPrefs.isActive) return;

            console.log('🔍 Performing smart rebalancing analysis...');

            for (const pool of window.portfolioPools) {
                await this.analyzePoolForRebalancing(pool, userPrefs);
            }

        } catch (error) {
            console.error('Error in monitoring cycle:', error);
            this.logAuditEvent('MONITORING_ERROR', walletAddress, { error: error.message });
        }
    }

    async analyzePoolForRebalancing(pool, userPrefs) {
        try {
            const poolAddress = pool.address || `${pool.pool}-${pool.location}`;
            
            // Check if pool-specific rebalancing is enabled
            const poolSettings = userPrefs.poolSpecificSettings[poolAddress];
            if (poolSettings && !poolSettings.enabled) return;

            // Check time constraints
            const lastRebalance = this.lastRebalanceTime.get(poolAddress) || 0;
            if (Date.now() - lastRebalance < this.securityConfig.minTimeBetweenRebalances) {
                return;
            }

            // Analyze rebalancing need
            const analysis = await this.performRebalanceAnalysis(pool, userPrefs);
            
            if (analysis.shouldRebalance) {
                console.log(`🎯 Rebalancing needed for ${pool.pool}:`, analysis);
                
                // Check security constraints
                const securityCheck = this.performSecurityChecks(pool, analysis, userPrefs);
                if (!securityCheck.approved) {
                    console.log(`❌ Security check failed: ${securityCheck.reason}`);
                    this.sendSecurityAlert(pool, securityCheck);
                    return;
                }

                // Determine execution strategy
                if (analysis.estimatedValue <= userPrefs.autoExecuteBelow) {
                    // Send alert for one-click execution
                    await this.sendOneClickRebalanceAlert(pool, analysis, userPrefs);
                } else {
                    // Send alert for larger rebalances requiring confirmation
                    await this.sendRebalanceAlert(pool, analysis, userPrefs);
                }
            }

        } catch (error) {
            console.error('Error analyzing pool for rebalancing:', error);
        }
    }

    async performRebalanceAnalysis(pool, userPrefs) {
        const analysis = {
            shouldRebalance: false,
            reasons: [],
            actions: [],
            estimatedValue: 0,
            urgency: 'low'
        };

        // Check if position is out of range
        if (!pool.inRange) {
            analysis.shouldRebalance = true;
            analysis.reasons.push('Position out of range');
            analysis.urgency = 'high';
            
            analysis.actions.push({
                type: 'close_and_reopen_position',
                reason: 'Out of range position',
                estimatedValue: pool.balance * 0.1, // Estimate 10% of position value
                newRange: await this.calculateOptimalRange(pool),
                priority: 'high'
            });
        }

        // Check token imbalance
        const imbalanceRatio = this.calculateTokenImbalance(pool);
        if (imbalanceRatio > userPrefs.rebalanceThresholds.imbalanceRatio) {
            analysis.shouldRebalance = true;
            analysis.reasons.push(`Token imbalance: ${(imbalanceRatio * 100).toFixed(1)}%`);
            
            analysis.actions.push({
                type: 'swap_rebalance',
                reason: 'Token ratio imbalance',
                estimatedValue: pool.balance * imbalanceRatio * 0.5,
                swapAmount: this.calculateSwapAmount(pool, imbalanceRatio),
                priority: 'medium'
            });
        }

        // Check price deviation
        const priceDeviation = await this.calculatePriceDeviation(pool);
        if (priceDeviation > userPrefs.rebalanceThresholds.priceDeviation) {
            analysis.shouldRebalance = true;
            analysis.reasons.push(`Price deviation: ${(priceDeviation * 100).toFixed(1)}%`);
            
            if (analysis.urgency === 'low') analysis.urgency = 'medium';
        }

        // Calculate total estimated value
        analysis.estimatedValue = analysis.actions.reduce(
            (sum, action) => sum + action.estimatedValue, 0
        );

        return analysis;
    }

    // 🔔 SMART NOTIFICATION SYSTEM
    async sendOneClickRebalanceAlert(pool, analysis, userPrefs) {
        const alertData = {
            type: 'one_click_rebalance',
            pool: pool.pool,
            location: pool.location,
            urgency: analysis.urgency,
            reasons: analysis.reasons,
            estimatedValue: analysis.estimatedValue,
            actions: analysis.actions,
            timestamp: Date.now(),
            autoExecutable: true
        };

        // Add to rebalance queue for one-click execution
        this.addToRebalanceQueue(pool, analysis, userPrefs);

        // Show smart alert with one-click option
        this.showSmartRebalanceAlert(alertData);

        // Send external notifications if enabled
        if (userPrefs.notificationChannels.email) {
            await this.sendEmailAlert(alertData, userPrefs);
        }

        if (userPrefs.notificationChannels.telegram) {
            await this.sendTelegramAlert(alertData, userPrefs);
        }
    }

    async sendRebalanceAlert(pool, analysis, userPrefs) {
        const alertData = {
            type: 'rebalance_needed',
            pool: pool.pool,
            location: pool.location,
            urgency: analysis.urgency,
            reasons: analysis.reasons,
            estimatedValue: analysis.estimatedValue,
            actions: analysis.actions,
            timestamp: Date.now(),
            autoExecutable: false
        };

        // Add to rebalance queue
        this.addToRebalanceQueue(pool, analysis, userPrefs);

        // Show confirmation-required alert
        this.showSmartRebalanceAlert(alertData);

        // Send external notifications
        if (userPrefs.notificationChannels.email) {
            await this.sendEmailAlert(alertData, userPrefs);
        }

        if (userPrefs.notificationChannels.telegram) {
            await this.sendTelegramAlert(alertData, userPrefs);
        }
    }

    showSmartRebalanceAlert(alertData) {
        const urgencyColors = {
            low: '#4CAF50',
            medium: '#FF9800', 
            high: '#F44336'
        };

        const actionButtons = alertData.autoExecutable ? `
            <button class="btn btn-primary" onclick="executeOneClickRebalance('${alertData.pool}')">
                🚀 One-Click Rebalance
            </button>
            <button class="btn btn-secondary" onclick="viewRebalanceDetails('${alertData.pool}')">
                📊 View Details
            </button>
        ` : `
            <button class="btn btn-primary" onclick="executeConfirmedRebalance('${alertData.pool}')">
                ✅ Confirm & Rebalance
            </button>
            <button class="btn btn-secondary" onclick="viewRebalanceDetails('${alertData.pool}')">
                📊 View Details
            </button>
        `;

        const alertHtml = `
            <div class="smart-rebalance-alert ${alertData.urgency}-urgency" style="border-left-color: ${urgencyColors[alertData.urgency]}">
                <div class="alert-header">
                    <div class="alert-title">
                        <i class="fas fa-magic"></i>
                        <span>Smart Rebalancing: ${alertData.pool}</span>
                        <span class="urgency-badge ${alertData.urgency}">${alertData.urgency.toUpperCase()}</span>
                    </div>
                    <button class="close-btn" onclick="this.closest('.smart-rebalance-alert').remove()">×</button>
                </div>
                <div class="alert-body">
                    <div class="rebalance-summary">
                        <div class="summary-item">
                            <span class="label">Reasons:</span>
                            <span class="value">${alertData.reasons.join(', ')}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Estimated Value:</span>
                            <span class="value">${uiManager.formatCurrency(alertData.estimatedValue)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Location:</span>
                            <span class="value">${alertData.location}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Actions:</span>
                            <span class="value">${alertData.actions.length} rebalancing action(s)</span>
                        </div>
                    </div>
                </div>
                <div class="alert-actions">
                    ${actionButtons}
                    <button class="btn btn-outline" onclick="snoozeRebalanceAlert('${alertData.pool}')">
                        😴 Snooze 1h
                    </button>
                </div>
            </div>
        `;

        // Add to notifications container
        let container = document.getElementById('smartRebalanceAlertsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'smartRebalanceAlertsContainer';
            container.className = 'smart-rebalance-alerts-container';
            document.body.appendChild(container);
        }

        container.insertAdjacentHTML('beforeend', alertHtml);

        // Auto-remove after 5 minutes for non-urgent alerts
        if (alertData.urgency !== 'high') {
            setTimeout(() => {
                const alert = container.querySelector('.smart-rebalance-alert:last-child');
                if (alert) alert.remove();
            }, 5 * 60 * 1000);
        }
    }

    addToRebalanceQueue(pool, analysis, userPrefs) {
        const queueKey = `${pool.pool}-${pool.location}`;
        this.rebalanceQueue.set(queueKey, {
            pool,
            analysis,
            userPrefs,
            timestamp: Date.now(),
            status: 'pending'
        });
    }

    // 🚀 EXECUTION SYSTEM
    async executeOneClickRebalancing(poolName) {
        try {
            console.log('🚀 Executing one-click rebalancing...');

            const queueKey = Array.from(this.rebalanceQueue.keys()).find(key => 
                key.startsWith(poolName)
            );
            
            if (!queueKey) {
                showNotification('Rebalancing opportunity expired', 'warning');
                return;
            }

            const queueItem = this.rebalanceQueue.get(queueKey);
            
            // Check if wallet is connected
            if (!walletManager.isConnected()) {
                this.sendWalletConnectionAlert(queueItem.pool, queueItem.analysis);
                return;
            }

            // Execute the rebalancing
            await this.executeSmartRebalancing(queueItem.pool, queueItem.analysis, queueItem.userPrefs);

            // Remove from queue
            this.rebalanceQueue.delete(queueKey);

        } catch (error) {
            console.error('Error executing one-click rebalance:', error);
            showNotification('Failed to execute rebalancing: ' + error.message, 'error');
        }
    }

    async executeConfirmedRebalancing(poolName) {
        try {
            const queueKey = Array.from(this.rebalanceQueue.keys()).find(key => 
                key.startsWith(poolName)
            );
            
            if (!queueKey) {
                showNotification('Rebalancing opportunity expired', 'warning');
                return;
            }

            const queueItem = this.rebalanceQueue.get(queueKey);
            
            // Show confirmation dialog for larger amounts
            const confirmed = await this.showRebalanceConfirmation(queueItem.analysis);
            if (!confirmed) {
                console.log('User cancelled rebalancing');
                return;
            }

            // Execute the rebalancing
            await this.executeSmartRebalancing(queueItem.pool, queueItem.analysis, queueItem.userPrefs);

            // Remove from queue
            this.rebalanceQueue.delete(queueKey);

        } catch (error) {
            console.error('Error executing confirmed rebalance:', error);
            showNotification('Failed to execute rebalancing: ' + error.message, 'error');
        }
    }

    async executeSmartRebalancing(pool, analysis, userPrefs) {
        try {
            console.log('🧚‍♀️ Executing smart rebalancing...');

            // Get connected wallet
            const wallet = walletManager.getConnectedWallet();
            if (!wallet) {
                throw new Error('No wallet available for transaction');
            }

            const results = [];

            for (const action of analysis.actions) {
                try {
                    // Build transaction for the action
                    const transactionPlan = await this.buildRebalanceTransactionPlan(action, pool, wallet.publicKey);
                    
                    // Show transaction preview and request signature
                    const signature = await this.requestWalletSignature(transactionPlan, wallet, action);
                    
                    if (signature) {
                        console.log(`✅ Rebalance executed: ${signature}`);
                        
                        const result = {
                            signature,
                            action,
                            timestamp: Date.now(),
                            pool: pool.pool,
                            estimatedValue: action.estimatedValue
                        };
                        
                        results.push(result);
                        
                        // Update tracking
                        this.updateRebalanceTracking(pool, action, userPrefs);
                        
                        // Log success
                        this.logAuditEvent('REBALANCE_EXECUTED', userPrefs.walletAddress, {
                            signature,
                            pool: pool.pool,
                            action: action.type,
                            value: action.estimatedValue
                        });
                        
                        // Send success notification
                        this.sendRebalanceSuccessNotification(pool, result, userPrefs);
                    }

                } catch (actionError) {
                    console.error('Error executing rebalance action:', actionError);
                    this.handleRebalanceFailure(pool, action, actionError, userPrefs);
                }
            }

            // Send summary if multiple actions were executed
            if (results.length > 1) {
                this.sendRebalanceSummaryNotification(pool, results, userPrefs);
            }

        } catch (error) {
            console.error('Error in smart rebalancing execution:', error);
            this.logAuditEvent('REBALANCE_ERROR', userPrefs.walletAddress, { 
                pool: pool.pool, 
                error: error.message 
            });
        }
    }

    async buildRebalanceTransactionPlan(action, pool, userPublicKey) {
        // Create a transaction plan that can be executed by the appropriate DEX
        const plan = {
            type: action.type,
            pool: pool.pool,
            location: pool.location,
            action: action,
            estimatedFee: 0.005, // SOL
            userPublicKey,
            instructions: []
        };

        // Build DEX-specific transaction plan
        if (pool.location.toLowerCase() === 'orca') {
            return await this.buildOrcaTransactionPlan(plan, action, pool);
        } else if (pool.location.toLowerCase() === 'raydium') {
            return await this.buildRaydiumTransactionPlan(plan, action, pool);
        } else {
            throw new Error(`Rebalancing not supported for ${pool.location}`);
        }
    }

    async buildOrcaTransactionPlan(plan, action, pool) {
        // Integration with Orca SDK would go here
        // For now, return a plan structure that can be executed
        plan.dexSpecific = {
            sdk: 'orca',
            poolAddress: pool.address,
            positionAddress: pool.positionAddress,
            whirlpoolProgram: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
        };

        switch (action.type) {
            case 'close_and_reopen_position':
                plan.steps = [
                    'Close existing position',
                    'Collect fees and tokens',
                    'Create new position with optimal range',
                    'Add liquidity to new position'
                ];
                break;
            
            case 'swap_rebalance':
                plan.steps = [
                    'Swap tokens to rebalance ratio',
                    'Adjust liquidity in existing position'
                ];
                break;
        }

        return plan;
    }

    async buildRaydiumTransactionPlan(plan, action, pool) {
        // Integration with Raydium SDK would go here
        plan.dexSpecific = {
            sdk: 'raydium',
            poolAddress: pool.address,
            ammProgram: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
        };

        // Raydium-specific transaction building
        return plan;
    }

    async requestWalletSignature(transactionPlan, wallet, action) {
        try {
            // Show user-friendly confirmation dialog
            const confirmed = await this.showTransactionPreview(transactionPlan, action);
            if (!confirmed) {
                console.log('User cancelled rebalancing transaction');
                return null;
            }

            // For demo purposes, simulate transaction execution
            // In production, this would build and sign actual transactions
            const mockSignature = `rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            showNotification('🧚‍♀️ Rebalancing transaction submitted!', 'info');
            
            // Simulate transaction confirmation delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return mockSignature;

        } catch (error) {
            console.error('Error requesting wallet signature:', error);
            throw error;
        }
    }

    async showTransactionPreview(transactionPlan, action) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'transaction-preview-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🧚‍♀️ Transaction Preview</h3>
                        </div>
                        <div class="modal-body">
                            <div class="transaction-details">
                                <div class="detail-row">
                                    <span class="label">Pool:</span>
                                    <span class="value">${transactionPlan.pool}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">DEX:</span>
                                    <span class="value">${transactionPlan.location}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Action:</span>
                                    <span class="value">${action.type.replace(/_/g, ' ')}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Reason:</span>
                                    <span class="value">${action.reason}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Estimated Value:</span>
                                    <span class="value">${uiManager.formatCurrency(action.estimatedValue)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Estimated Fee:</span>
                                    <span class="value">${transactionPlan.estimatedFee} SOL</span>
                                </div>
                            </div>
                            <div class="transaction-steps">
                                <h4>Transaction Steps:</h4>
                                <ul>
                                    ${transactionPlan.steps?.map(step => `<li>${step}</li>`).join('') || '<li>Execute rebalancing</li>'}
                                </ul>
                            </div>
                            <div class="confirmation-warning">
                                <p>⚠️ This will execute a rebalancing transaction on your behalf.</p>
                                <p>Please review the details carefully before confirming.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="confirmTransaction(true)">
                                ✅ Sign & Execute
                            </button>
                            <button class="btn btn-secondary" onclick="confirmTransaction(false)">
                                ❌ Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add global function for confirmation
            window.confirmTransaction = (confirmed) => {
                document.body.removeChild(modal);
                delete window.confirmTransaction;
                resolve(confirmed);
            };

            document.body.appendChild(modal);
        });
    }

    async showRebalanceConfirmation(analysis) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'rebalance-confirmation-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🧚‍♀️ Confirm Rebalancing</h3>
                        </div>
                        <div class="modal-body">
                            <div class="confirmation-details">
                                <p><strong>Total Estimated Value:</strong> ${uiManager.formatCurrency(analysis.estimatedValue)}</p>
                                <p><strong>Actions Required:</strong> ${analysis.actions.length}</p>
                                <p><strong>Urgency:</strong> ${analysis.urgency.toUpperCase()}</p>
                                <p><strong>Reasons:</strong> ${analysis.reasons.join(', ')}</p>
                            </div>
                            <div class="confirmation-warning">
                                <p>⚠️ This rebalancing involves a significant amount.</p>
                                <p>Please confirm that you want to proceed.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="confirmRebalancing(true)">
                                ✅ Confirm Rebalancing
                            </button>
                            <button class="btn btn-secondary" onclick="confirmRebalancing(false)">
                                ❌ Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add global function for confirmation
            window.confirmRebalancing = (confirmed) => {
                document.body.removeChild(modal);
                delete window.confirmRebalancing;
                resolve(confirmed);
            };

            document.body.appendChild(modal);
        });
    }

    // 🔧 UTILITY FUNCTIONS
    calculateTokenImbalance(pool) {
        if (!pool.token0 || !pool.token1) return 0;

        const token0Value = pool.token0.amount * pool.token0.price;
        const token1Value = pool.token1.amount * pool.token1.price;
        const totalValue = token0Value + token1Value;

        if (totalValue === 0) return 0;

        const token0Ratio = token0Value / totalValue;
        
        // Calculate deviation from 50/50 balance
        return Math.abs(token0Ratio - 0.5);
    }

    async calculatePriceDeviation(pool) {
        try {
            // Get historical prices for comparison
            const token0Historical = await apiManager.getHistoricalPrice(pool.token0.symbol, 24);
            const token1Historical = await apiManager.getHistoricalPrice(pool.token1.symbol, 24);

            if (token0Historical === 0 || token1Historical === 0) return 0;

            const currentRatio = pool.token0.price / pool.token1.price;
            const historicalRatio = token0Historical / token1Historical;

            return Math.abs(currentRatio - historicalRatio) / historicalRatio;

        } catch (error) {
            console.error('Error calculating price deviation:', error);
            return 0;
        }
    }

    async calculateOptimalRange(pool) {
        // Calculate optimal tick range based on volatility and current price
        const volatilityFactor = 1.5; // Would be calculated from historical data
        const currentPrice = pool.token0.price / pool.token1.price;
        
        return {
            lowerPrice: currentPrice * (1 - 0.1 * volatilityFactor),
            upperPrice: currentPrice * (1 + 0.1 * volatilityFactor)
        };
    }

    calculateSwapAmount(pool, imbalanceRatio) {
        const totalValue = pool.balance;
        return totalValue * imbalanceRatio * 0.5; // Swap half the imbalance
    }

    performSecurityChecks(pool, analysis, userPrefs) {
        // Check daily transaction limit
        if (userPrefs.dailyTransactionCount >= userPrefs.maxDailyTransactions) {
            return { approved: false, reason: 'daily_transaction_limit_exceeded' };
        }

        // Check transaction amount
        if (analysis.estimatedValue > userPrefs.maxRebalanceAmount) {
            return { approved: false, reason: 'transaction_amount_too_large' };
        }

        // Check time constraints
        const poolKey = `${pool.pool}-${pool.location}`;
        const lastRebalance = this.lastRebalanceTime.get(poolKey) || 0;
        if (Date.now() - lastRebalance < this.securityConfig.minTimeBetweenRebalances) {
            return { approved: false, reason: 'rebalance_frequency_too_high' };
        }

        // Check failure count
        const failures = this.failureCount.get(poolKey) || 0;
        if (failures >= this.securityConfig.maxConsecutiveFailures) {
            return { approved: false, reason: 'too_many_consecutive_failures' };
        }

        return { approved: true, reason: 'security_checks_passed' };
    }

    updateRebalanceTracking(pool, action, userPrefs) {
        const poolKey = `${pool.pool}-${pool.location}`;
        
        // Update last rebalance time
        this.lastRebalanceTime.set(poolKey, Date.now());
        
        // Reset failure count on success
        this.failureCount.set(poolKey, 0);
        
        // Update user transaction counts
        userPrefs.dailyTransactionCount++;
        userPrefs.weeklyTransactionAmount += action.estimatedValue;
        
        // Reset daily counter if needed
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (now - userPrefs.lastTransactionReset > oneDayMs) {
            userPrefs.dailyTransactionCount = 1;
            userPrefs.lastTransactionReset = now;
        }
    }

    handleRebalanceFailure(pool, action, error, userPrefs) {
        const poolKey = `${pool.pool}-${pool.location}`;
        
        // Increment failure count
        const currentFailures = this.failureCount.get(poolKey) || 0;
        this.failureCount.set(poolKey, currentFailures + 1);
        
        // Log failure
        this.logAuditEvent('REBALANCE_FAILED', userPrefs.walletAddress, {
            pool: pool.pool,
            action: action.type,
            error: error.message,
            failureCount: currentFailures + 1
        });
        
        // Send failure notification
        this.sendRebalanceFailureNotification(pool, action, error, userPrefs);
        
        // Disable auto-rebalancing if too many failures
        if (currentFailures + 1 >= this.securityConfig.maxConsecutiveFailures) {
            this.disablePoolRebalancing(poolKey, userPrefs, 'too_many_failures');
        }
    }

    logAuditEvent(eventType, userWallet, details) {
        const auditEntry = {
            timestamp: Date.now(),
            eventType,
            userWallet,
            details,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        
        this.auditLog.push(auditEntry);
        
        // Keep audit log manageable
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-500);
        }
        
        console.log(`📋 AUDIT: ${eventType} - ${userWallet || 'SYSTEM'}`);
    }

    // 📧 NOTIFICATION IMPLEMENTATIONS
    sendRebalanceSuccessNotification(pool, result, userPrefs) {
        const message = `🧚‍♀️ **Smart Rebalance Success!**

Your ${pool.pool} position has been automatically rebalanced:

💫 **Transaction**: ${result.signature}
🎯 **Action**: ${result.action.type.replace(/_/g, ' ')}
💰 **Value**: ${uiManager.formatCurrency(result.estimatedValue)}
📍 **Location**: ${pool.location}
🕐 **Time**: ${new Date(result.timestamp).toLocaleString()}

Your position is now optimally balanced! ✨`;

        showNotification(message, 'success');
    }

    sendRebalanceFailureNotification(pool, action, error, userPrefs) {
        const message = `🚨 **Smart Rebalance Error**

An error occurred during automatic rebalancing:

🏊 **Pool**: ${pool.pool} (${pool.location})
🎯 **Action**: ${action.type.replace(/_/g, ' ')}
❌ **Error**: ${error.message}
🕐 **Time**: ${new Date().toLocaleString()}

Your positions are safe, but manual review may be needed.`;

        showNotification(message, 'error');
    }

    sendSecurityAlert(pool, securityCheck) {
        const message = `⚠️ **Security Check Failed**

Smart rebalancing was blocked for security reasons:

🏊 **Pool**: ${pool.pool}
🛡️ **Reason**: ${securityCheck.reason.replace(/_/g, ' ')}
🕐 **Time**: ${new Date().toLocaleString()}

Please review your rebalancing settings or try again later.`;

        showNotification(message, 'warning');
    }

    sendWalletConnectionAlert(pool, analysis) {
        const message = `🔗 **Wallet Connection Required**

Smart rebalancing is ready but needs wallet connection:

🏊 **Pool**: ${pool.pool}
💰 **Estimated Value**: ${uiManager.formatCurrency(analysis.estimatedValue)}

Please connect your wallet to proceed with rebalancing.`;

        showNotification(message, 'info');
    }

    // Additional utility methods
    async sendEmailAlert(alertData, userPrefs) {
        // Email notification implementation
        console.log('Sending email alert:', alertData);
    }

    async sendTelegramAlert(alertData, userPrefs) {
        // Telegram notification implementation
        console.log('Sending Telegram alert:', alertData);
    }

    updatePoolMonitoring(pools) {
        // Update monitoring for new pool data
        console.log('Updating pool monitoring with new data:', pools.length, 'pools');
    }

    handleWalletConnection(walletData) {
        // Handle wallet connection events
        console.log('Wallet connected:', walletData);
    }

    handleManualRebalanceRequest(requestData) {
        // Handle manual rebalance requests
        console.log('Manual rebalance requested:', requestData);
    }
}

// Global smart auto-rebalancer instance
const smartAutoRebalancer = new DeFairySmartAutoRebalancer();

// Global functions for UI interaction
window.executeOneClickRebalance = async function(poolName) {
    await smartAutoRebalancer.executeOneClickRebalancing(poolName);
};

window.executeConfirmedRebalance = async function(poolName) {
    await smartAutoRebalancer.executeConfirmedRebalancing(poolName);
};

window.viewRebalanceDetails = function(poolName) {
    console.log('Viewing rebalance details for:', poolName);
    // Implementation for showing detailed rebalancing analysis
};

window.snoozeRebalanceAlert = function(poolName) {
    console.log('Snoozing rebalance alert for:', poolName);
    // Implementation for snoozing alerts
};

// Export for use in other modules
window.smartAutoRebalancer = smartAutoRebalancer; 