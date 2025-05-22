import { useState } from 'react';
import { useWallet } from '../lib/wallet';
import { showNotification } from '../lib/wallet';

export default function Header({ onLoadPortfolio }) {
  const { publicKey, connectPhantom, isValidSolanaAddress } = useWallet();
  const [walletAddress, setWalletAddress] = useState('');

  const handleConnectWallet = async () => {
    const result = await connectPhantom();
    if (result.success && result.publicKey) {
      setWalletAddress(result.publicKey);
    }
  };

  const handleLoadPortfolio = () => {
    const address = walletAddress || publicKey;
    if (!address) {
      showNotification('Please enter a wallet address or connect your wallet.', 'warning');
      return;
    }

    if (!isValidSolanaAddress(address)) {
      showNotification('Please enter a valid Solana wallet address.', 'error');
      return;
    }

    onLoadPortfolio(address);
  };

  return (
    <header className="header">
      <div className="logo">
        <i className="fas fa-magic"></i>
        DeFairy
      </div>
      <div className="wallet-section">
        <input 
          type="text" 
          className="wallet-input" 
          placeholder="Enter Solana wallet address..." 
          id="walletAddress"
          value={walletAddress || publicKey || ''}
          onChange={(e) => setWalletAddress(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={handleConnectWallet}>
          <i className="fas fa-wallet"></i>
          Connect Phantom
        </button>
        <button className="btn btn-primary" onClick={handleLoadPortfolio}>
          <i className="fas fa-search"></i>
          Load Portfolio
        </button>
      </div>
    </header>
  );
} 