#!/usr/bin/env node

// Simple Helius API Test
// Tests the Helius API with a known working endpoint

console.log('🔍 Testing Helius API Integration...\n');

// Test with a simple public endpoint first
async function testPublicEndpoint() {
    console.log('📡 Test 1: Public Helius Endpoint (No Auth Required)');
    
    try {
        const response = await fetch('https://api.helius.xyz/v0/token-metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mintAccounts: ['So11111111111111111111111111111111111111112'] // SOL token
            })
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Public endpoint: SUCCESS');
            console.log(`   Data received: ${data.length} token(s)`);
            return true;
        } else {
            console.log('❌ Public endpoint: FAILED');
            const errorText = await response.text();
            console.log(`   Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Public endpoint: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Test with API key (you'll need to provide this)
async function testWithAPIKey(apiKey) {
    if (!apiKey || apiKey === 'YOUR_HELIUS_API_KEY_HERE') {
        console.log('\n⚠️  Skipping authenticated tests - no valid API key provided');
        console.log('   To test with your API key, run:');
        console.log('   HELIUS_API_KEY=your_actual_key node test-helius-simple.js');
        return false;
    }
    
    console.log('\n🔑 Test 2: Authenticated Helius API');
    console.log(`   Using API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    
    const testWallet = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    
    try {
        const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'test',
                method: 'getBalance',
                params: [testWallet]
            })
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.result) {
                console.log('✅ Authenticated API: SUCCESS');
                console.log(`   Wallet: ${testWallet}`);
                console.log(`   Balance: ${data.result.value / 1e9} SOL`);
                return true;
            } else {
                console.log('❌ Authenticated API: FAILED');
                console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
                return false;
            }
        } else {
            console.log('❌ Authenticated API: FAILED');
            const errorText = await response.text();
            console.log(`   Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Authenticated API: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    const apiKey = process.env.HELIUS_API_KEY;
    
    const results = [];
    results.push(await testPublicEndpoint());
    results.push(await testWithAPIKey(apiKey));
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed > 0) {
        console.log('\n🎉 Helius API is accessible!');
        if (apiKey && apiKey !== 'YOUR_HELIUS_API_KEY_HERE') {
            console.log('✅ Your API key is working correctly.');
        } else {
            console.log('⚠️  Please set your HELIUS_API_KEY environment variable to test authentication.');
        }
    } else {
        console.log('\n❌ Helius API is not accessible. Please check your internet connection.');
    }
}

// Run the tests
runTests().catch(console.error);
