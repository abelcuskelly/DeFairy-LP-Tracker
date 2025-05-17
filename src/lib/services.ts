import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';
import { PortfolioData, PoolData } from './mockData';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Redis client (for production use)
let redis: any = null;

// Connect to Redis if URL is provided
if (process.env.REDIS_URL) {
  redis = createRedisClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_API_KEY || '',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
  });
  
  // Connect to Redis (don't wait for connection to complete)
  redis.connect().catch((err: any) => {
    console.error('Redis connection error:', err);
  });
}

// Cache TTL in seconds
const CACHE_TTL = {
  PORTFOLIO: 60, // 1 minute
  POOLS: 60, // 1 minute
  HISTORICAL: 60 * 60, // 1 hour
};

// Service functions

// Store user preferences in Supabase
export const saveUserPreferences = async (walletAddress: string, preferences: any) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        wallet_address: walletAddress,
        preferences,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
};

// Get user preferences from Supabase
export const getUserPreferences = async (walletAddress: string) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data?.preferences || null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
};

// Store historical data in Supabase
export const saveHistoricalData = async (walletAddress: string, date: string, data: any) => {
  try {
    const { data: result, error } = await supabase
      .from('historical_data')
      .upsert({
        wallet_address: walletAddress,
        date,
        data,
      })
      .select();

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error saving historical data:', error);
    throw error;
  }
};

// Get historical data from Supabase
export const getHistoricalData = async (walletAddress: string, startDate: string, endDate: string) => {
  try {
    const { data, error } = await supabase
      .from('historical_data')
      .select('date, data')
      .eq('wallet_address', walletAddress)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting historical data:', error);
    return [];
  }
};

// Cache portfolio data in Redis
export const cachePortfolioData = async (walletAddress: string, data: PortfolioData) => {
  if (!redis) return;
  
  try {
    const key = `portfolio:${walletAddress}`;
    await redis.set(key, JSON.stringify(data), { EX: CACHE_TTL.PORTFOLIO });
  } catch (error) {
    console.error('Redis cache error:', error);
  }
};

// Get cached portfolio data from Redis
export const getCachedPortfolioData = async (walletAddress: string): Promise<PortfolioData | null> => {
  if (!redis) return null;
  
  try {
    const key = `portfolio:${walletAddress}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis cache error:', error);
    return null;
  }
};

// Cache pools data in Redis
export const cachePoolsData = async (walletAddress: string, data: PoolData[]) => {
  if (!redis) return;
  
  try {
    const key = `pools:${walletAddress}`;
    await redis.set(key, JSON.stringify(data), { EX: CACHE_TTL.POOLS });
  } catch (error) {
    console.error('Redis cache error:', error);
  }
};

// Get cached pools data from Redis
export const getCachedPoolsData = async (walletAddress: string): Promise<PoolData[] | null> => {
  if (!redis) return null;
  
  try {
    const key = `pools:${walletAddress}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis cache error:', error);
    return null;
  }
}; 