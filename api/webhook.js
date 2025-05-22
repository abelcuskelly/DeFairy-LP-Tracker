// Serverless function to handle Helius webhooks for auto-rebalancing
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify the webhook signature if provided
        const signature = req.headers['x-helius-webhook-signature'];
        // In production, you would verify this signature with a shared secret
        
        const eventData = req.body;
        console.log('Received webhook event:', JSON.stringify(eventData));
        
        // Process different event types
        if (eventData.type === 'ACCOUNT_DATA') {
            await processAccountUpdate(eventData);
        } else if (eventData.type === 'PRICE_UPDATE') {
            await processPriceUpdate(eventData);
        } else {
            console.log('Unknown event type:', eventData.type);
        }
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return res.status(500).json({ error: 'An error occurred while processing the webhook' });
    }
}

// Process account data update (for tracking LP position changes)
async function processAccountUpdate(eventData) {
    try {
        const accountAddress = eventData.accountAddress;
        const accountData = eventData.data;
        
        // Check if this is a known LP position
        // In production, you would:
        // 1. Query a database to see if this account belongs to a user with auto-rebalancing enabled
        // 2. Check if the position is now out of range
        // 3. Calculate optimal new position
        // 4. Execute rebalancing if needed
        
        console.log(`Processing account update for ${accountAddress}`);
        
        // Check if this is a Whirlpool position account
        if (accountData && accountData.program === 'whirlpool') {
            // Check if position is out of range
            const tickCurrentIndex = accountData.tickCurrentIndex;
            const tickLowerIndex = accountData.tickLowerIndex;
            const tickUpperIndex = accountData.tickUpperIndex;
            
            const inRange = tickCurrentIndex >= tickLowerIndex && tickCurrentIndex < tickUpperIndex;
            
            if (!inRange) {
                // Position is out of range, trigger rebalancing
                console.log(`Position ${accountAddress} is out of range. Initiating rebalance.`);
                await initiateRebalance(accountAddress, accountData);
            }
        }
    } catch (error) {
        console.error('Error processing account update:', error);
    }
}

// Process price update (for monitoring price movements that might require rebalancing)
async function processPriceUpdate(eventData) {
    try {
        const token = eventData.token;
        const price = eventData.price;
        const priceChange24h = eventData.priceChange24h;
        
        console.log(`Price update for ${token}: $${price} (24h change: ${priceChange24h}%)`);
        
        // If price change is significant, check affected positions
        if (Math.abs(priceChange24h) > 5) {
            // In production, you would:
            // 1. Query database for positions containing this token
            // 2. For each position, check if it's close to going out of range
            // 3. Alert users or automatically rebalance if enabled
            
            console.log(`Significant price change detected for ${token}. Checking affected positions.`);
            await checkAffectedPositions(token, price, priceChange24h);
        }
    } catch (error) {
        console.error('Error processing price update:', error);
    }
}

// Initiate rebalancing for a position
async function initiateRebalance(positionAddress, positionData) {
    try {
        // In production, you would:
        // 1. Query database to find the owner of this position
        // 2. Check if auto-rebalancing is enabled for this user/position
        // 3. Calculate optimal new position range
        // 4. Use a secure admin wallet to submit rebalancing transaction
        // 5. Update database with new position details
        
        // For demonstration, we'll just log what would happen
        const ownerAddress = "OWNER_ADDRESS"; // In production, get from database
        const autoRebalanceEnabled = true;    // In production, get from database
        
        if (!autoRebalanceEnabled) {
            console.log(`Auto-rebalancing not enabled for position ${positionAddress}`);
            return;
        }
        
        // Calculate new tick range (centered around current price)
        const tickCurrentIndex = positionData.tickCurrentIndex;
        const tickSpacing = positionData.tickSpacing;
        
        // For simplicity, create a new range centered around current price
        // In production, you would use more sophisticated strategy
        const newLowerTick = tickCurrentIndex - (10 * tickSpacing);
        const newUpperTick = tickCurrentIndex + (10 * tickSpacing);
        
        console.log(`Calculated new range for position ${positionAddress}: ${newLowerTick} to ${newUpperTick}`);
        
        // In production, execute the rebalancing transaction
        console.log(`Would execute rebalancing for position ${positionAddress} owned by ${ownerAddress}`);
        
        // Send notification to user
        await sendNotification(ownerAddress, {
            type: 'rebalance',
            positionAddress,
            oldLowerTick: positionData.tickLowerIndex,
            oldUpperTick: positionData.tickUpperIndex,
            newLowerTick,
            newUpperTick,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error initiating rebalance:', error);
    }
}

// Check positions affected by significant price changes
async function checkAffectedPositions(token, price, priceChange) {
    try {
        // In production, you would:
        // 1. Query database for positions containing this token
        // 2. For each position, check if it's close to going out of range
        
        // For demonstration, we'll just log what would happen
        console.log(`Checking positions containing ${token} affected by ${priceChange}% price change`);
        
        // Mock list of affected positions
        const affectedPositions = [
            // In production, this would come from database
            { positionAddress: "POSITION_1", ownerAddress: "OWNER_1", tickLowerIndex: 100, tickUpperIndex: 200, tickCurrentIndex: 190 },
            { positionAddress: "POSITION_2", ownerAddress: "OWNER_2", tickLowerIndex: 300, tickUpperIndex: 400, tickCurrentIndex: 310 }
        ];
        
        for (const position of affectedPositions) {
            // Check if position is at risk of going out of range
            const tickCurrentIndex = position.tickCurrentIndex;
            const tickLowerIndex = position.tickLowerIndex;
            const tickUpperIndex = position.tickUpperIndex;
            
            // Calculate how close to range boundaries
            const lowerDistance = tickCurrentIndex - tickLowerIndex;
            const upperDistance = tickUpperIndex - tickCurrentIndex;
            const minDistance = Math.min(lowerDistance, upperDistance);
            
            // If within 10% of range, alert user
            const rangeSize = tickUpperIndex - tickLowerIndex;
            if (minDistance < rangeSize * 0.1) {
                console.log(`Position ${position.positionAddress} is close to going out of range. Alerting user.`);
                
                await sendNotification(position.ownerAddress, {
                    type: 'warning',
                    positionAddress: position.positionAddress,
                    message: `Your ${token} position is close to going out of range due to recent price movements`,
                    timestamp: Date.now()
                });
            }
        }
    } catch (error) {
        console.error('Error checking affected positions:', error);
    }
}

// Send notification to user
async function sendNotification(userAddress, data) {
    try {
        // In production, you would:
        // 1. Store notification in database
        // 2. Send push notification, email, or display in UI next time user connects
        
        console.log(`Sending notification to ${userAddress}:`, data);
        
        // For demonstration, we'll just log what would happen
        // In production, you might use a service like Firebase Cloud Messaging
    } catch (error) {
        console.error('Error sending notification:', error);
    }
} 