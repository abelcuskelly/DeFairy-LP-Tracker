# DeFairy - Magical Solana LP Portfolio Tracker 🧚‍♀️

A comprehensive portfolio tracker for Solana liquidity pools with pool-specific alert system, real-time monitoring, and AI-powered assistance.

![DeFairy](https://img.shields.io/badge/DeFairy-Solana%20LP%20Tracker-4a90e2?style=for-the-badge&logo=solana)

## 🌟 Features

### 📊 Complete Portfolio Management
- **Multi-DEX Support**: Automatically tracks positions across Orca, Raydium, Meteora, and Drift
- **Real-time Portfolio Stats**: Total balance, P&L, APY, fees earned
- **Position Monitoring**: Track in-range/out-of-range status for all positions
- **Historical Analysis**: View performance over 24h, week, month, and all-time

### 🚨 Pool-Specific Alert System
- **Individual Pool Monitoring**: Enable alerts for specific pools or all pools at once
- **Smart Threshold Detection**: 
  - 25/75 token imbalance alerts
  - Out-of-range position notifications
  - Price deviation warnings (5% default)
- **Multi-Channel Notifications**:
  - In-app pop-up alerts
  - Telegram bot integration (configurable)
  - Email notifications (configurable)
- **Customizable Settings**: Adjust alert thresholds per your risk tolerance

### 🔔 Advanced Notification System
- **Real-time Alerts**: Instant notifications when rebalancing is needed
- **Notification Settings Modal**: Configure Telegram chat ID and email preferences
- **Alert Severity Levels**: Critical, high, and medium priority alerts
- **Auto-Dismiss**: Notifications auto-remove after 30 seconds
- **Direct Action**: Click to open pool on respective DEX for manual rebalancing

### 🌊 Advanced Pool Monitoring
- **5 Monitoring Methods**:
  1. Wallet transaction history
  2. Specific pool monitoring
  3. Real-time WebSocket updates
  4. Current position tracking
  5. Bitquery GraphQL backup

- **Enhanced Transaction Data**:
  - Operation types (swap, add/remove liquidity, collect fees)
  - Token balance changes
  - Fee breakdowns
  - Price impact calculations

### 🤖 AI Assistant
- **GPT-4o Integration**: Get intelligent DeFi advice
- **Context-Aware**: Understands your portfolio and positions
- **Strategy Suggestions**: Rebalancing, yield optimization, risk management

### 🔌 Integrations

#### Helius Enhanced API (Primary)
- Transaction parsing and enhancement
- Real-time WebSocket subscriptions
- Account monitoring
- Price feeds

#### Direct Program Integration
- **Orca Whirlpools**: Direct integration with CLMM positions
- **Position Calculation**: Accurate position values and ranges
- **Fee Tracking**: Real-time fee accrual monitoring

#### Bitquery API (Backup)
- GraphQL queries for historical data
- Cross-DEX transaction aggregation
- Alternative data source for reliability

## 📊 Comprehensive P&L Calculation System

### 🧮 Enhanced P&L Formula

DeFairy uses a comprehensive, transparent P&L calculation that provides complete visibility into your liquidity provision performance:

```
P&L = Fees Earned + Impermanent Loss/Gain + Price Appreciation
```

### 📈 Multi-Period Analysis

The same comprehensive formula is applied consistently across all time periods:

- **1 Hour (1h)**: Real-time short-term performance
- **24 Hours (24h)**: Daily performance tracking
- **7 Days (7d)**: Weekly trend analysis  
- **30 Days (30d)**: Monthly performance overview

### 🔍 Component Breakdown

#### 1. **Fees Earned**
- Trading fees collected from your liquidity provision
- Calculated based on your share of pool trading volume
- Represents the primary income from LP positions

#### 2. **Impermanent Loss/Gain**
- Calculated using the standard IL formula: `2 * sqrt(ratio) / (1 + ratio) - 1`
- Measures gain/loss from token price ratio changes
- Positive values indicate impermanent gain, negative indicate loss

#### 3. **Price Appreciation**
- Value change from underlying token price movements
- Calculated as: `Current Position Value - Historical Position Value`
- Reflects the USD value change of your token holdings

### 🎯 Interactive P&L Breakdown

- **Info Icons**: Click the ℹ️ icon next to any P&L value for detailed breakdown
- **Time Period Tabs**: Switch between 1h, 24h, 7d, and 30d views in the modal
- **Color Coding**: Green for gains, red for losses
- **Real-time Updates**: All calculations update automatically with new data

### 🔧 Technical Implementation

- **Consistent Methodology**: Same calculation logic across all DEXes (Orca, Raydium, Meteora)
- **Historical Price Data**: Fetches historical prices for accurate period calculations
- **Fallback Systems**: Multiple data sources ensure calculation reliability
- **Performance Optimized**: Efficient caching and batch processing

### 📋 Example Breakdown

```
SOL/USDC Pool (24h):
├── Fees Earned: +$18.76
├── Impermanent Loss: -$2.31
├── Price Appreciation: +$107.00
└── Total P&L: +$123.45
```

This transparent approach gives you complete insight into:
- How much you're earning from fees
- Whether price movements are helping or hurting your position
- The net effect of all factors on your LP performance

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Solana wallet (Phantom recommended)
- API Keys (optional, included defaults for demo)

### Installation

```bash
# Clone the repository
git clone https://github.com/Defairy/DeFairy-WebApp.git
cd defairy

# Install dependencies
npm install

# Run locally
npm run dev
```

### Deployment

The app is configured for easy deployment on Vercel:

```bash
# Deploy to Vercel
vercel deploy --prod
```

## 🎯 Usage

### Basic Portfolio Tracking

1. **Enter Wallet Address**: Simply paste any Solana wallet address
2. **Connect Wallet**: Click "Connect Phantom" for wallet integration
3. **Automatic Loading**: Portfolio data loads automatically from all DEXes

### Pool-Specific Alert Configuration

1. **Enable Pool Alerts**: Toggle the switch in the "Alerts" column for each pool
2. **Select All Pools**: Use the master toggle to enable alerts for all pools at once
3. **Configure Notifications**: Click "Notification Settings" to set up:
   - Telegram bot notifications (requires chat ID)
   - Email alerts (requires email address)
   - In-app notifications (enabled by default)
4. **Customize Thresholds**: Set imbalance ratio and price deviation alerts

### Pool Activity Monitor

Access advanced monitoring features:

1. Navigate to "Pool Activity Monitor" section
2. Select monitoring type:
   - **Monitor Wallet**: Track all DEX activity for a wallet
   - **Monitor Pool**: Watch specific pool transactions
   - **Real-time**: Live WebSocket updates
3. Choose DEX (Orca, Raydium, Meteora)
4. Click "Start Monitoring"

### AI Assistant

1. Click the robot icon in the bottom right
2. Ask questions about:
   - Portfolio optimization
   - Rebalancing strategies
   - Yield farming tips
   - Market analysis
3. Get personalized recommendations

## 🛠️ Technical Architecture

### Frontend
- **Pure HTML/CSS/JavaScript**: No framework dependencies
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: WebSocket integration
- **Magical Animations**: Smooth, delightful UI

### Backend
- **Serverless Functions**: Vercel edge functions
- **API Routes**:
  - `/api/openai`: AI assistant endpoint
  - `/api/webhook`: Helius webhook handler
  - `/api/notifications/telegram`: Telegram bot integration
  - `/api/notifications/email`: Email notification service

### Data Sources
1. **Helius API**: Primary data provider
2. **Orca SDK**: Direct program integration
3. **Jupiter API**: Token prices
4. **Bitquery**: Backup data source

## 🔧 Configuration

### Environment Variables

Create a `.env` file or set in Vercel:

```env
OPENAI_API_KEY=your_openai_api_key
HELIUS_API_KEY=your_helius_api_key
BITQUERY_API_KEY=your_bitquery_api_key (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token (optional)
SENDGRID_API_KEY=your_sendgrid_api_key (optional)
```

### API Keys

Default API keys are included for demo purposes. For production:
1. Get your own [Helius API key](https://helius.xyz)
2. Get your own [OpenAI API key](https://openai.com)
3. Set up [Telegram Bot](https://core.telegram.org/bots#botfather) for notifications
4. Configure [SendGrid](https://sendgrid.com) for email alerts
5. Update in Vercel dashboard or `.env` file

### Notification Setup

#### Telegram Notifications
1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
4. Configure in notification settings

#### Email Notifications
1. Sign up for [SendGrid](https://sendgrid.com)
2. Create an API key
3. Verify your sender email
4. Configure in notification settings

## �� Project Structure

```
defairy/
├── index.html              # Main application
├── styles/
│   └── main.css           # Styling with notification UI
├── scripts/
│   ├── main.js            # App initialization
│   ├── wallet.js          # Wallet connection
│   ├── api.js             # API management
│   ├── helius.js          # Helius integration
│   ├── orca.js            # Orca program integration
│   ├── poolMonitor.js     # Pool monitoring system
│   ├── poolMonitorUI.js   # Monitoring UI
│   ├── defairyIntegration.js # DEX integration
│   ├── ui.js              # UI management with notification modal
│   ├── openai.js          # AI assistant
│   └── autoRebalancing.js # Pool-specific alert system
├── api/
│   ├── openai.js          # OpenAI serverless function
│   ├── webhook.js         # Webhook handler
│   └── notifications.js   # Notification endpoints
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies
```

## 🌈 Features in Detail

### Pool-Specific Alert System
- **Individual Control**: Enable/disable alerts per pool
- **Smart Detection**: Monitors token imbalance, out-of-range positions, price deviations
- **Configurable Thresholds**: Customize when alerts trigger
- **Multiple Notification Channels**: In-app, Telegram, email
- **Persistent Settings**: Configuration saved in localStorage

### Automatic DEX Integration
- No manual steps required
- Loads data from all supported DEXes automatically
- Real-time monitoring starts on wallet connection
- Seamless position aggregation

### Enhanced Transaction Parsing
- Identifies operation types (swap, liquidity changes)
- Calculates token balance changes
- Tracks fees and price impact
- Historical position calculation

### Position Management
- Current position values
- In/out of range detection
- APY calculations
- Fee tracking
- P&L analysis

### Real-time Updates
- WebSocket connections for live data
- Account change notifications
- Price update alerts
- Transaction monitoring

## ⚠️ Important Notes

### Auto-Rebalancing Limitations
Due to Solana's security model:
- **Manual Approval Required**: Each transaction needs wallet signature
- **No Pre-Authorization**: Cannot execute transactions automatically
- **Alert-Based System**: Provides notifications for manual action

The alert system is designed to notify users when rebalancing is optimal, but execution requires manual wallet approval for security.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Helius](https://helius.xyz) for enhanced Solana APIs
- [Orca](https://orca.so) for liquidity pool infrastructure
- [OpenAI](https://openai.com) for GPT-4o integration
- [Telegram](https://telegram.org) for bot API
- [SendGrid](https://sendgrid.com) for email services
- Solana community for the amazing ecosystem

---

Built with 💜 by the DeFairy Team 