# 🗄️ DeFairy Database Setup Guide

## Overview

This guide will help you set up the Supabase database for DeFairy to enable:
- ✅ **Historical P&L Tracking**
- ✅ **Performance Analytics**
- ✅ **Position Data Storage**
- ✅ **Price Data Caching**
- ✅ **User Preferences**
- ✅ **Alert Management**

## 🚀 Quick Setup

### Step 1: Create Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

### Step 2: Run Database Schema

1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Click "Run" to create all tables and indexes

### Step 3: Update Environment Variables

Add these to your Vercel environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Test Database Connection

1. Load your DeFairy application
2. Connect a wallet and load portfolio
3. Check browser console for database connection messages
4. Click "Analytics" button to view stored data

## 📊 Database Schema

### Core Tables

#### **users**
- Stores user wallet addresses and preferences
- Row Level Security (RLS) enabled

#### **pools**
- Stores pool metadata (addresses, tokens, fees)
- Public data, no RLS needed

#### **positions**
- Stores user liquidity positions
- Links to users and pools
- RLS enabled

#### **position_snapshots**
- Historical position data for analytics
- Automatically created when positions update

#### **token_prices**
- Cached token price data
- Reduces API calls and improves performance

#### **pl_calculations**
- Stored P&L calculations for different time periods
- Enables fast historical analysis

#### **alerts**
- User alerts and notifications
- RLS enabled

#### **transactions**
- Transaction history tracking
- RLS enabled

## 🔒 Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Automatic wallet-based filtering
- Secure multi-tenant architecture

### Data Validation
- Input validation on all database operations
- Type checking and constraint enforcement
- Automatic timestamp management

## 📈 Analytics Features

### Portfolio Overview
- Total portfolio value tracking
- P&L calculations across time periods
- Performance metrics and trends

### Position Analytics
- Individual position performance
- DEX-specific filtering
- Profit/loss breakdowns

### Historical Data
- Time-series data visualization
- Export functionality
- Custom date range selection

### Alert Management
- Real-time alert notifications
- Severity-based categorization
- Read/unread status tracking

## 🛠️ API Integration

### Database Service Layer
The `DatabaseService` class provides:

```javascript
// Initialize database connection
await window.databaseService.initialize();

// Store position data
await window.databaseService.createOrUpdatePosition(positionData);

// Get cached prices
const price = await window.databaseService.getTokenPrice(tokenAddress);

// Get user analytics
const analytics = await window.databaseService.getPositionAnalytics(positionId);
```

### Automatic Data Storage
- Positions are automatically stored when portfolio loads
- Price data is cached to reduce API calls
- Historical snapshots are created for analytics

## 🔧 Maintenance

### Data Cleanup
The system automatically cleans up old data:

```javascript
// Clean up data older than 90 days
await window.databaseService.cleanupOldData(90);
```

### Performance Optimization
- Indexes on frequently queried columns
- Efficient query patterns
- Connection pooling

## 📊 Monitoring

### Database Usage
Monitor your Supabase usage in the dashboard:
- API requests
- Database size
- Bandwidth usage

### Performance Metrics
- Query execution times
- Index usage
- Connection counts

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
- Check Supabase URL and API key
- Verify environment variables in Vercel
- Check browser console for errors

#### RLS Policy Errors
- Ensure wallet address is set correctly
- Check user exists in database
- Verify RLS policies are enabled

#### Performance Issues
- Check database indexes
- Monitor query performance
- Consider data cleanup

### Debug Mode
Enable debug logging:

```javascript
// In browser console
window.databaseService.debug = true;
```

## 🔄 Migration Guide

### From No Database
1. Follow the setup steps above
2. Existing users will have data stored on first portfolio load
3. Historical data will be built over time

### From Other Database
1. Export existing data
2. Transform to match schema
3. Import using Supabase dashboard

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Performance Tips](https://supabase.com/docs/guides/database/performance)

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase dashboard for connection status
3. Review this guide for common solutions
4. Check DeFairy GitHub issues for known problems

---

**🎉 Congratulations!** Your DeFairy application now has full database integration with historical tracking, analytics, and performance monitoring!
