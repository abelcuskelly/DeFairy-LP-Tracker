// OpenAI integration for AI Assistant
class OpenAIManager {
    constructor() {
        // Check if we're in a production environment
        this.isProduction = window.location.hostname !== 'localhost';
        
        // Use the API endpoint based on environment
        this.apiEndpoint = this.isProduction 
            ? '/api/openai' 
            : 'https://api.openai.com/v1/chat/completions';
            
        this.model = 'gpt-4o';
        this.loading = false;
    }

    async generateResponse(message) {
        try {
            this.loading = true;
            showAITypingIndicator();
            
            let response;
            let aiResponse;
            
            if (this.isProduction) {
                // Use the serverless function in production
                response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to connect to API');
                }
                
                const data = await response.json();
                aiResponse = data.response;
            } else {
                // Use direct OpenAI API for local development
                response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAPIKey()}`
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are Fairy AI, a helpful DeFi assistant specialized in Solana liquidity pools. ' +
                                        'You help users optimize their liquidity positions, suggest rebalancing strategies, ' +
                                        'and provide insights about yields, fees, and market trends. ' +
                                        'Keep responses concise, informative, and helpful for DeFi users. ' +
                                        'Use a friendly, magical tone with occasional fairy emoji. 🧚‍♀️'
                            },
                            { role: 'user', content: message }
                        ],
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'Failed to connect to OpenAI');
                }

                const data = await response.json();
                aiResponse = data.choices[0].message.content;
            }
            
            return aiResponse;
            
        } catch (error) {
            console.error('OpenAI API Error:', error);
            return `Sorry, I encountered an error: ${error.message}. Please try again later. 🧚‍♀️`;
        } finally {
            this.loading = false;
            hideAITypingIndicator();
        }
    }

    getAPIKey() {
        // SECURITY WARNING: Never expose API keys in client-side code
        // This method should only be used for local development
        // In production, always use server-side API endpoints
        console.warn('SECURITY WARNING: API key access in client-side code detected!');
        console.warn('This should only be used for local development. Use server-side endpoints in production.');
        
        // For local development only - remove this in production
        if (window.location.hostname === 'localhost') {
            return window.OPENAI_API_KEY || 'YOUR_LOCAL_API_KEY_HERE';
        }
        
        throw new Error('API key access not allowed in production environment');
    }
}

// Global OpenAI manager instance
const openAIManager = new OpenAIManager();

// Helper functions for typing indicator
function showAITypingIndicator() {
    const chatBody = document.getElementById('aiChatBody');
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'aiTypingIndicator';
    typingIndicator.className = 'ai-typing-indicator';
    typingIndicator.innerHTML = '<span>•</span><span>•</span><span>•</span>';
    chatBody.appendChild(typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function hideAITypingIndicator() {
    const typingIndicator = document.getElementById('aiTypingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
} 