# DeFairy - Magical Solana LP Portfolio Tracker 🧚‍♀️

A comprehensive portfolio tracker for Solana liquidity pools with automatic DEX integration, real-time monitoring, and AI-powered assistance.

![DeFairy](https://img.shields.io/badge/DeFairy-Solana%20LP%20Tracker-4a90e2?style=for-the-badge&logo=solana)

## 🌟 Features

### 📊 Complete Portfolio Management
- **Multi-DEX Support**: Automatically tracks positions across Orca, Raydium, Meteora, and Drift
- **Real-time Portfolio Stats**: Total balance, P&L, APY, fees earned
- **Position Monitoring**: Track in-range/out-of-range status for all positions
- **Historical Analysis**: View performance over 24h, week, month, and all-time

### 🔄 Auto-Rebalancing System
- **Smart Position Monitoring**: Automatically detects when positions go out of range
- **Optimization Recommendations**: AI-powered suggestions for optimal tick ranges
- **One-Click Rebalancing**: Execute rebalancing directly from the interface
- **Webhook Integration**: Real-time notifications via Helius webhooks

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

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Solana wallet (Phantom recommended)
- API Keys (optional, included defaults for demo)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/defairy.git
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

### Pool Activity Monitor

Access advanced monitoring features:

1. Navigate to "Pool Activity Monitor" section
2. Select monitoring type:
   - **Monitor Wallet**: Track all DEX activity for a wallet
   - **Monitor Pool**: Watch specific pool transactions
   - **Real-time**: Live WebSocket updates
3. Choose DEX (Orca, Raydium, Meteora)
4. Click "Start Monitoring"

### Auto-Rebalancing

1. Click "Enable Auto-Rebalancing" button
2. System monitors positions for optimization opportunities
3. Receive notifications when rebalancing is recommended
4. Execute rebalancing with one click

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
```

### API Keys

Default API keys are included for demo purposes. For production:
1. Get your own [Helius API key](https://helius.xyz)
2. Get your own [OpenAI API key](https://openai.com)
3. Update in Vercel dashboard or `.env` file

## 📁 Project Structure

```
defairy/
├── index.html              # Main application
├── styles/
│   └── main.css           # Styling
├── scripts/
│   ├── main.js            # App initialization
│   ├── wallet.js          # Wallet connection
│   ├── api.js             # API management
│   ├── helius.js          # Helius integration
│   ├── orca.js            # Orca program integration
│   ├── poolMonitor.js     # Pool monitoring system
│   ├── poolMonitorUI.js   # Monitoring UI
│   ├── defairyIntegration.js # DEX integration
│   ├── ui.js              # UI management
│   ├── openai.js          # AI assistant
│   └── autoRebalancing.js # Auto-rebalancing logic
├── api/
│   ├── openai.js          # OpenAI serverless function
│   └── webhook.js         # Webhook handler
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies
```

## 🌈 Features in Detail

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Helius](https://helius.xyz) for enhanced Solana APIs
- [Orca](https://orca.so) for liquidity pool infrastructure
- [OpenAI](https://openai.com) for GPT-4o integration
- Solana community for the amazing ecosystem

---

Built with 💜 by the DeFairy Team 