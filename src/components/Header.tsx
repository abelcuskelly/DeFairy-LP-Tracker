import React from 'react';
import Link from 'next/link';
import { WalletConnectButton } from './WalletConnectButton';

interface HeaderProps {
  walletAddress?: string;
}

const Header: React.FC<HeaderProps> = ({ walletAddress }) => {
  // Function to format wallet address
  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <header className="bg-fairy-blue-950/90 border-b border-fairy-blue-800/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-bold text-fairy-blue-50 sparkle-effect">
            DeFairy
          </h1>
        </Link>

        <div className="flex items-center space-x-4">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
};

export default Header; 