-- DeFairy Database Schema for Supabase
-- This file contains the SQL schema for storing position and pricing data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for tracking user preferences and settings)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);

-- Pools table (for storing pool metadata)
CREATE TABLE IF NOT EXISTS pools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pool_address TEXT UNIQUE NOT NULL,
    dex_name TEXT NOT NULL, -- 'orca', 'raydium', 'meteora'
    token0_address TEXT NOT NULL,
    token1_address TEXT NOT NULL,
    token0_symbol TEXT,
    token1_symbol TEXT,
    fee_tier INTEGER,
    tick_spacing INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions table (for storing user liquidity positions)
CREATE TABLE IF NOT EXISTS positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
    position_address TEXT UNIQUE NOT NULL,
    token0_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    token1_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    token0_value_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
    token1_value_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
    total_value_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
    tick_lower_index INTEGER,
    tick_upper_index INTEGER,
    tick_current_index INTEGER,
    in_range BOOLEAN DEFAULT true,
    fees_earned DECIMAL(20, 8) DEFAULT 0,
    apy_24h DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Position snapshots table (for historical tracking)
CREATE TABLE IF NOT EXISTS position_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    token0_amount DECIMAL(20, 8) NOT NULL,
    token1_amount DECIMAL(20, 8) NOT NULL,
    token0_value_usd DECIMAL(20, 2) NOT NULL,
    token1_value_usd DECIMAL(20, 2) NOT NULL,
    total_value_usd DECIMAL(20, 2) NOT NULL,
    fees_earned DECIMAL(20, 8) DEFAULT 0,
    tick_current_index INTEGER,
    in_range BOOLEAN DEFAULT true,
    snapshot_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token prices table (for caching price data)
CREATE TABLE IF NOT EXISTS token_prices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token_address TEXT NOT NULL,
    symbol TEXT,
    name TEXT,
    price_usd DECIMAL(20, 8) NOT NULL,
    market_cap DECIMAL(20, 2),
    volume_24h DECIMAL(20, 2),
    price_change_24h DECIMAL(10, 4),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_address, last_updated)
);

-- P&L calculations table (for storing calculated P&L data)
CREATE TABLE IF NOT EXISTS pl_calculations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    time_period TEXT NOT NULL, -- '1h', '24h', '7d', '30d'
    fees_earned DECIMAL(20, 2) DEFAULT 0,
    impermanent_loss_gain DECIMAL(20, 2) DEFAULT 0,
    price_appreciation DECIMAL(20, 2) DEFAULT 0,
    total_pl DECIMAL(20, 2) DEFAULT 0,
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(position_id, time_period, calculation_timestamp)
);

-- Alerts table (for storing user alerts and notifications)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'out_of_range', 'high_impermanent_loss', 'price_deviation'
    alert_message TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (for tracking user transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    transaction_signature TEXT UNIQUE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'add_liquidity', 'remove_liquidity', 'swap', 'rebalance'
    token0_amount DECIMAL(20, 8),
    token1_amount DECIMAL(20, 8),
    fees_paid DECIMAL(20, 8),
    gas_fee DECIMAL(20, 8),
    transaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pools_pool_address ON pools(pool_address);
CREATE INDEX IF NOT EXISTS idx_pools_dex_name ON pools(dex_name);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_pool_id ON positions(pool_id);
CREATE INDEX IF NOT EXISTS idx_positions_position_address ON positions(position_address);
CREATE INDEX IF NOT EXISTS idx_position_snapshots_position_id ON position_snapshots(position_id);
CREATE INDEX IF NOT EXISTS idx_position_snapshots_timestamp ON position_snapshots(snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_token_prices_token_address ON token_prices(token_address);
CREATE INDEX IF NOT EXISTS idx_token_prices_last_updated ON token_prices(last_updated);
CREATE INDEX IF NOT EXISTS idx_pl_calculations_position_id ON pl_calculations(position_id);
CREATE INDEX IF NOT EXISTS idx_pl_calculations_time_period ON pl_calculations(time_period);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_position_id ON alerts(position_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_position_id ON transactions(position_id);
CREATE INDEX IF NOT EXISTS idx_transactions_signature ON transactions(transaction_signature);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pl_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (wallet_address = current_setting('app.current_wallet_address', true));
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (wallet_address = current_setting('app.current_wallet_address', true));
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_wallet_address', true));

-- Positions policies
CREATE POLICY "Users can view own positions" ON positions FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true)));
CREATE POLICY "Users can update own positions" ON positions FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true)));
CREATE POLICY "Users can insert own positions" ON positions FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true)));

-- Similar policies for other tables...
CREATE POLICY "Users can view own snapshots" ON position_snapshots FOR SELECT USING (position_id IN (SELECT id FROM positions WHERE user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true))));
CREATE POLICY "Users can view own pl_calculations" ON pl_calculations FOR SELECT USING (position_id IN (SELECT id FROM positions WHERE user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true))));
CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true)));
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('app.current_wallet_address', true)));

-- Public tables (no RLS needed)
-- pools, token_prices are public data

-- Insert some sample data for testing
INSERT INTO pools (pool_address, dex_name, token0_address, token1_address, token0_symbol, token1_symbol, fee_tier, tick_spacing) VALUES
('HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ', 'orca', 'So11111111111111111111111111111111111111112', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'SOL', 'USDC', 500, 64),
('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2', 'raydium', 'So11111111111111111111111111111111111111112', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'SOL', 'USDC', 500, 64)
ON CONFLICT (pool_address) DO NOTHING;
