#!/usr/bin/env node

// Helius API Test Script
// This script tests the Helius API integration to verify connectivity and authentication

const https = require('https');

// Test configuration
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 'YOUR_HELIUS_API_KEY_HERE';
const TEST_WALLET_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; // Example Solana wallet

console.log('🔍 Testing Helius API Integration...\n');

// Test 1: Basic API connectivity
async function testBasicConnectivity() {
    console.log('📡 Test 1: Basic API Connectivity');
    
    const url = `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mintAccounts: ['So11111111111111111111111111111111111111112'] // SOL token
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Basic connectivity: SUCCESS');
            console.log(`   Response status: ${response.status}`);
            console.log(`   Data received: ${data.length} token(s)`);
            return true;
        } else {
            console.log('❌ Basic connectivity: FAILED');
            console.log(`   Status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`   Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Basic connectivity: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Test 2: Wallet balance check
async function testWalletBalance() {
    console.log('\n💰 Test 2: Wallet Balance Check');
    
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'balance-test',
                method: 'getBalance',
                params: [TEST_WALLET_ADDRESS]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.result) {
                console.log('✅ Wallet balance: SUCCESS');
                console.log(`   Wallet: ${TEST_WALLET_ADDRESS}`);
                console.log(`   Balance: ${data.result.value / 1e9} SOL`);
                return true;
            } else {
                console.log('❌ Wallet balance: FAILED');
                console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
                return false;
            }
        } else {
            console.log('❌ Wallet balance: FAILED');
            console.log(`   Status: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Wallet balance: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Test 3: Token account info
async function testTokenAccounts() {
    console.log('\n🪙 Test 3: Token Account Information');
    
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'token-accounts-test',
                method: 'getTokenAccountsByOwner',
                params: [
                    TEST_WALLET_ADDRESS,
                    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                    { encoding: 'jsonParsed' }
                ]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.result) {
                console.log('✅ Token accounts: SUCCESS');
                console.log(`   Token accounts found: ${data.result.value.length}`);
                return true;
            } else {
                console.log('❌ Token accounts: FAILED');
                console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
                return false;
            }
        } else {
            console.log('❌ Token accounts: FAILED');
            console.log(`   Status: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Token accounts: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Test 4: Enhanced API features
async function testEnhancedAPI() {
    console.log('\n🚀 Test 4: Enhanced API Features');
    
    const url = `https://api.helius.xyz/v0/addresses/${TEST_WALLET_ADDRESS}/transactions?api-key=${HELIUS_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Enhanced API: SUCCESS');
            console.log(`   Transactions found: ${data.length}`);
            return true;
        } else {
            console.log('❌ Enhanced API: FAILED');
            console.log(`   Status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`   Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Enhanced API: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log(`🔑 Using API Key: ${HELIUS_API_KEY.substring(0, 8)}...${HELIUS_API_KEY.substring(HELIUS_API_KEY.length - 4)}`);
    console.log(`🎯 Test Wallet: ${TEST_WALLET_ADDRESS}\n`);
    
    const results = [];
    
    results.push(await testBasicConnectivity());
    results.push(await testWalletBalance());
    results.push(await testTokenAccounts());
    results.push(await testEnhancedAPI());
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
        console.log('\n🎉 All tests passed! Helius API integration is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check your API key and configuration.');
    }
    
    console.log('\n💡 Next steps:');
    console.log('   - If tests failed, verify your HELIUS_API_KEY environment variable');
    console.log('   - Check that your API key has the necessary permissions');
    console.log('   - Ensure you have sufficient API quota remaining');
}

// Run the tests
runTests().catch(console.error);
