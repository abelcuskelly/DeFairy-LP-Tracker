// DeFairy Database Service Layer
// Handles all database operations for Supabase integration

class DatabaseService {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.currentWalletAddress = null;
    }

    async initialize() {
        try {
            // Check if we're in browser environment
            if (typeof window === 'undefined') {
                console.warn('Database service: Not in browser environment');
                return false;
            }

            // Load Supabase client dynamically
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
            
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zuvecrpcenaemfeqzunu.supabase.co';
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmVjcnBjZW5hZW1mZXF6dW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NzI1MTIsImV4cCI6MjA2MzA0ODUxMn0.Pg-0XkcHWHz2aoLcrdAnXt52E1eW-Wre1MNZxj-MIQQ';
            
            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.isInitialized = true;
            
            console.log('✅ Database service initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize database service:', error);
            return false;
        }
    }

    setCurrentWallet(walletAddress) {
        this.currentWalletAddress = walletAddress;
        // Set the wallet address in Supabase context for RLS
        if (this.supabase) {
            this.supabase.rpc('set_config', { 
                setting_name: 'app.current_wallet_address', 
                setting_value: walletAddress 
            });
        }
    }

    // User Management
    async getUser(walletAddress) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();
            
            if (error && error.code !== 'PGRST116') { // Not found is OK
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async createOrUpdateUser(walletAddress, preferences = {}) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .upsert({
                    wallet_address: walletAddress,
                    preferences: preferences,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'wallet_address'
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating/updating user:', error);
            return null;
        }
    }

    // Pool Management
    async getPool(poolAddress) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('pools')
                .select('*')
                .eq('pool_address', poolAddress)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Error getting pool:', error);
            return null;
        }
    }

    async createOrUpdatePool(poolData) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('pools')
                .upsert({
                    pool_address: poolData.poolAddress,
                    dex_name: poolData.dexName,
                    token0_address: poolData.token0Address,
                    token1_address: poolData.token1Address,
                    token0_symbol: poolData.token0Symbol,
                    token1_symbol: poolData.token1Symbol,
                    fee_tier: poolData.feeTier,
                    tick_spacing: poolData.tickSpacing,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'pool_address'
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating/updating pool:', error);
            return null;
        }
    }

    // Position Management
    async getUserPositions(walletAddress) {
        if (!this.isInitialized) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('positions')
                .select(`
                    *,
                    pools (*),
                    users (*)
                `)
                .eq('users.wallet_address', walletAddress);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting user positions:', error);
            return [];
        }
    }

    async createOrUpdatePosition(positionData) {
        if (!this.isInitialized) return null;
        
        try {
            // First ensure user exists
            const user = await this.createOrUpdateUser(positionData.walletAddress);
            if (!user) throw new Error('Failed to create user');
            
            // Ensure pool exists
            const pool = await this.createOrUpdatePool(positionData.pool);
            if (!pool) throw new Error('Failed to create pool');
            
            // Create or update position
            const { data, error } = await this.supabase
                .from('positions')
                .upsert({
                    user_id: user.id,
                    pool_id: pool.id,
                    position_address: positionData.positionAddress,
                    token0_amount: positionData.token0Amount,
                    token1_amount: positionData.token1Amount,
                    token0_value_usd: positionData.token0ValueUsd,
                    token1_value_usd: positionData.token1ValueUsd,
                    total_value_usd: positionData.totalValueUsd,
                    tick_lower_index: positionData.tickLowerIndex,
                    tick_upper_index: positionData.tickUpperIndex,
                    tick_current_index: positionData.tickCurrentIndex,
                    in_range: positionData.inRange,
                    fees_earned: positionData.feesEarned,
                    apy_24h: positionData.apy24h,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'position_address'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Create snapshot for historical tracking
            await this.createPositionSnapshot(data.id, positionData);
            
            return data;
        } catch (error) {
            console.error('Error creating/updating position:', error);
            return null;
        }
    }

    async createPositionSnapshot(positionId, positionData) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('position_snapshots')
                .insert({
                    position_id: positionId,
                    token0_amount: positionData.token0Amount,
                    token1_amount: positionData.token1Amount,
                    token0_value_usd: positionData.token0ValueUsd,
                    token1_value_usd: positionData.token1ValueUsd,
                    total_value_usd: positionData.totalValueUsd,
                    fees_earned: positionData.feesEarned,
                    tick_current_index: positionData.tickCurrentIndex,
                    in_range: positionData.inRange,
                    snapshot_timestamp: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating position snapshot:', error);
            return null;
        }
    }

    // Token Price Management
    async getTokenPrice(tokenAddress) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('token_prices')
                .select('*')
                .eq('token_address', tokenAddress)
                .order('last_updated', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Error getting token price:', error);
            return null;
        }
    }

    async updateTokenPrice(tokenData) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('token_prices')
                .insert({
                    token_address: tokenData.address,
                    symbol: tokenData.symbol,
                    name: tokenData.name,
                    price_usd: tokenData.priceUsd,
                    market_cap: tokenData.marketCap,
                    volume_24h: tokenData.volume24h,
                    price_change_24h: tokenData.priceChange24h,
                    last_updated: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating token price:', error);
            return null;
        }
    }

    // P&L Calculations
    async savePLCalculation(positionId, timePeriod, plData) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('pl_calculations')
                .insert({
                    position_id: positionId,
                    time_period: timePeriod,
                    fees_earned: plData.feesEarned,
                    impermanent_loss_gain: plData.impermanentLossGain,
                    price_appreciation: plData.priceAppreciation,
                    total_pl: plData.totalPL,
                    calculation_timestamp: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving P&L calculation:', error);
            return null;
        }
    }

    async getHistoricalPL(positionId, timePeriod = '24h') {
        if (!this.isInitialized) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('pl_calculations')
                .select('*')
                .eq('position_id', positionId)
                .eq('time_period', timePeriod)
                .order('calculation_timestamp', { ascending: false })
                .limit(30); // Last 30 calculations
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting historical P&L:', error);
            return [];
        }
    }

    // Alerts Management
    async createAlert(userId, positionId, alertData) {
        if (!this.isInitialized) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('alerts')
                .insert({
                    user_id: userId,
                    position_id: positionId,
                    alert_type: alertData.type,
                    alert_message: alertData.message,
                    severity: alertData.severity,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating alert:', error);
            return null;
        }
    }

    async getUserAlerts(walletAddress, unreadOnly = false) {
        if (!this.isInitialized) return [];
        
        try {
            let query = this.supabase
                .from('alerts')
                .select(`
                    *,
                    positions (*),
                    users (*)
                `)
                .eq('users.wallet_address', walletAddress);
            
            if (unreadOnly) {
                query = query.eq('is_read', false);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting user alerts:', error);
            return [];
        }
    }

    // Analytics and Reporting
    async getPositionAnalytics(positionId, days = 30) {
        if (!this.isInitialized) return null;
        
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const { data, error } = await this.supabase
                .from('position_snapshots')
                .select('*')
                .eq('position_id', positionId)
                .gte('snapshot_timestamp', startDate.toISOString())
                .order('snapshot_timestamp', { ascending: true });
            
            if (error) throw error;
            
            // Calculate analytics
            const analytics = this.calculatePositionAnalytics(data || []);
            return analytics;
        } catch (error) {
            console.error('Error getting position analytics:', error);
            return null;
        }
    }

    calculatePositionAnalytics(snapshots) {
        if (!snapshots || snapshots.length === 0) return null;
        
        const firstSnapshot = snapshots[0];
        const lastSnapshot = snapshots[snapshots.length - 1];
        
        const totalReturn = lastSnapshot.total_value_usd - firstSnapshot.total_value_usd;
        const totalReturnPercent = (totalReturn / firstSnapshot.total_value_usd) * 100;
        
        const totalFeesEarned = lastSnapshot.fees_earned - firstSnapshot.fees_earned;
        
        // Calculate volatility
        const values = snapshots.map(s => s.total_value_usd);
        const volatility = this.calculateVolatility(values);
        
        // Calculate max drawdown
        const maxDrawdown = this.calculateMaxDrawdown(values);
        
        return {
            totalReturn,
            totalReturnPercent,
            totalFeesEarned,
            volatility,
            maxDrawdown,
            snapshotsCount: snapshots.length,
            period: {
                start: firstSnapshot.snapshot_timestamp,
                end: lastSnapshot.snapshot_timestamp
            }
        };
    }

    calculateVolatility(values) {
        if (values.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < values.length; i++) {
            returns.push((values[i] - values[i-1]) / values[i-1]);
        }
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance) * Math.sqrt(365); // Annualized volatility
    }

    calculateMaxDrawdown(values) {
        let maxDrawdown = 0;
        let peak = values[0];
        
        for (let i = 1; i < values.length; i++) {
            if (values[i] > peak) {
                peak = values[i];
            } else {
                const drawdown = (peak - values[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }
        
        return maxDrawdown * 100; // Return as percentage
    }

    // Cleanup old data (run periodically)
    async cleanupOldData(daysToKeep = 90) {
        if (!this.isInitialized) return;
        
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            // Clean up old snapshots
            await this.supabase
                .from('position_snapshots')
                .delete()
                .lt('snapshot_timestamp', cutoffDate.toISOString());
            
            // Clean up old token prices
            await this.supabase
                .from('token_prices')
                .delete()
                .lt('last_updated', cutoffDate.toISOString());
            
            // Clean up old P&L calculations
            await this.supabase
                .from('pl_calculations')
                .delete()
                .lt('calculation_timestamp', cutoffDate.toISOString());
            
            console.log('✅ Cleaned up old data');
        } catch (error) {
            console.error('Error cleaning up old data:', error);
        }
    }
}

// Global database service instance
window.databaseService = new DatabaseService();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.databaseService.initialize();
    });
} else {
    window.databaseService.initialize();
}
