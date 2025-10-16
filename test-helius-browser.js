// Browser Environment Simulation for Helius API Test
// This simulates how the Helius API would work in your browser application

// Simulate browser environment
global.window = {
    HELIUS_API_KEY: process.env.HELIUS_API_KEY || 'YOUR_HELIUS_API_KEY_HERE',
    location: { hostname: 'localhost' }
};

// Import the Helius client (we'll recreate the key parts for testing)
class HeliusClient {
    constructor() {
        this.apiKey = this.getHeliusApiKey();
        this.mainnetRPC = 'https://mainnet.helius-rpc.com/?api-key=' + this.apiKey;
        this.apiBaseURL = 'https://api.helius.xyz/v0';
    }

    getHeliusApiKey() {
        console.warn('SECURITY: Helius API key should be loaded from environment variables');
        
        if (typeof window !== 'undefined' && window.HELIUS_API_KEY) {
            return window.HELIUS_API_KEY;
        }
        
        return 'YOUR_HELIUS_API_KEY_HERE';
    }

    async testConnection() {
        console.log('🔍 Testing Helius API Connection...');
        console.log(`🔑 API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
        
        try {
            const response = await fetch(this.mainnetRPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'test-connection',
                    method: 'getHealth'
                })
            });

            const data = await response.json();
            
            if (response.ok && data.result) {
                console.log('✅ Helius API Connection: SUCCESS');
                console.log(`   Status: ${response.status}`);
                console.log(`   Health: ${data.result}`);
                return true;
            } else {
                console.log('❌ Helius API Connection: FAILED');
                console.log(`   Status: ${response.status}`);
                console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            console.log('❌ Helius API Connection: ERROR');
            console.log(`   Error: ${error.message}`);
            return false;
        }
    }

    async testWalletBalance(walletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM') {
        console.log(`💰 Testing Wallet Balance for: ${walletAddress}`);
        
        try {
            const response = await fetch(this.mainnetRPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'balance-test',
                    method: 'getBalance',
                    params: [walletAddress]
                })
            });

            const data = await response.json();
            
            if (response.ok && data.result) {
                console.log('✅ Wallet Balance: SUCCESS');
                console.log(`   Balance: ${data.result.value / 1e9} SOL`);
                return true;
            } else {
                console.log('❌ Wallet Balance: FAILED');
                console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            console.log('❌ Wallet Balance: ERROR');
            console.log(`   Error: ${error.message}`);
            return false;
        }
    }
}

// Run the test
async function runHeliusTest() {
    console.log('🧚‍♀️ DeFairy Helius API Integration Test\n');
    
    const heliusClient = new HeliusClient();
    
    const results = [];
    results.push(await heliusClient.testConnection());
    results.push(await heliusClient.testWalletBalance());
    
    console.log('\n📊 Test Results:');
    console.log('================');
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
        console.log('\n🎉 All tests passed! Your Helius API integration is working correctly.');
        console.log('✅ Your application should be able to fetch Solana data successfully.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check:');
        console.log('   1. Your HELIUS_API_KEY environment variable');
        console.log('   2. Your API key permissions and quota');
        console.log('   3. Your internet connection');
    }
    
    console.log('\n💡 To test with your actual API key:');
    console.log('   HELIUS_API_KEY=your_actual_key node test-helius-browser.js');
}

// Run the test
runHeliusTest().catch(console.error);
