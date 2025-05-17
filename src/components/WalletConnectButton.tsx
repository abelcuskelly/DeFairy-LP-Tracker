'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnectButton: React.FC = () => {
  const { wallet, publicKey, connecting, connected, disconnect } = useWallet();
  const [walletAddress, setWalletAddress] = React.useState<string>('');

  React.useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toString());
    } else {
      setWalletAddress('');
    }
  }, [publicKey]);

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="inline-block">
      {!connected ? (
        <div className="fairy-button flex items-center relative">
          <WalletMultiButton className="bg-transparent p-0 border-none text-white hover:bg-transparent hover:text-white" />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full bg-fairy-green-400 animate-pulse"></span>
        </div>
      ) : (
        <div className="fairy-card py-2 px-4 flex items-center cursor-pointer" onClick={disconnect}>
          <div className="w-2 h-2 rounded-full bg-fairy-green-400 mr-2"></div>
          <span className="text-fairy-blue-200 text-sm">
            {formatWalletAddress(walletAddress)}
          </span>
        </div>
      )}
    </div>
  );
}; 