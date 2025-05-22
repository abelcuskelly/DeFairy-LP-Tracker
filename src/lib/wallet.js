// Wallet utilities
import { useState, useEffect } from 'react';

export function showNotification(message, type = 'info') {
    if (typeof window === 'undefined') return;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'rgba(50, 205, 50, 0.2)' : 
                   type === 'error' ? 'rgba(255, 107, 107, 0.2)' : 
                   type === 'warning' ? 'rgba(255, 165, 0, 0.2)' : 
                   'rgba(75, 104, 238, 0.2)'};
        border: 1px solid ${type === 'success' ? '#32cd32' : 
                           type === 'error' ? '#ff6b6b' : 
                           type === 'warning' ? '#ffa500' : 
                           '#4b68ee'};
        border-radius: 10px;
        color: white;
        z-index: 10000;
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Hook for wallet connection
export function useWallet() {
    const [publicKey, setPublicKey] = useState(null);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if wallet is connected on mount
        checkWalletConnection();
    }, []);

    const checkWalletConnection = async () => {
        if (typeof window === 'undefined' || !window.solana) return;

        try {
            if (window.solana.isPhantom && window.solana.isConnected) {
                const key = window.solana.publicKey.toString();
                setPublicKey(key);
                setConnected(true);
            }
        } catch (error) {
            console.log('No wallet connection found on startup');
        }
    };

    const connectPhantom = async () => {
        if (typeof window === 'undefined') return { success: false, error: 'Browser environment not available' };
        
        setLoading(true);
        try {
            if (window.solana && window.solana.isPhantom) {
                const response = await window.solana.connect();
                const key = response.publicKey.toString();
                
                setPublicKey(key);
                setConnected(true);
                
                showNotification('Wallet connected successfully!', 'success');
                
                return {
                    success: true,
                    publicKey: key
                };
            } else {
                throw new Error('Phantom wallet not found. Please install Phantom wallet.');
            }
        } catch (error) {
            showNotification('Failed to connect wallet: ' + error.message, 'error');
            return {
                success: false,
                error: error.message
            };
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = async () => {
        if (typeof window === 'undefined') return;
        
        try {
            if (window.solana && connected) {
                await window.solana.disconnect();
            }
            
            setPublicKey(null);
            setConnected(false);
            
            showNotification('Wallet disconnected', 'info');
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    };

    const isValidSolanaAddress = (address) => {
        // Basic Solana address validation (base58, length check)
        try {
            return address && address.length >= 32 && address.length <= 44 && 
                   /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
        } catch {
            return false;
        }
    };

    return {
        publicKey,
        connected,
        loading,
        connectPhantom,
        disconnectWallet,
        isValidSolanaAddress
    };
} 