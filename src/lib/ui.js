// UI utility functions

// Format currency values
export function formatCurrency(value, decimals = 2) {
    if (typeof value !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

// Format percentage values
export function formatPercentage(value, decimals = 1) {
    if (typeof value !== 'number') return '0.0%';
    return `${value.toFixed(decimals)}%`;
}

// Simple debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// AI Assistant responses
export function getAIResponse(message) {
    const responses = {
        rebalance: "I recommend rebalancing your out-of-range pools. Your USDT/USDC position could benefit from adjusting the price range.",
        optimize: "To optimize yields, consider concentrating liquidity in tighter ranges for stable pairs and wider ranges for volatile pairs.",
        fees: "Your fee earnings are performing well! The SOL/USDC pool is generating the highest fees due to good trading volume.",
        apy: "Your average APY of 14.8% is above market average. Consider adding more capital to your best-performing pools.",
        default: "I'm here to help with your DeFi strategy! Ask me about rebalancing, optimization, fees, or APY calculations."
    };
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('rebalance')) return responses.rebalance;
    if (lowerMessage.includes('optimize') || lowerMessage.includes('yield')) return responses.optimize;
    if (lowerMessage.includes('fee')) return responses.fees;
    if (lowerMessage.includes('apy') || lowerMessage.includes('return')) return responses.apy;
    
    return responses.default;
} 