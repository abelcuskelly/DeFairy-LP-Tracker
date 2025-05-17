import '../styles/globals.css';
import React from 'react';
import type { Metadata } from 'next';
import WalletConnectionProvider from '../components/WalletConnectionProvider';

export const metadata: Metadata = {
  title: 'DeFairy | Magical DeFi Dashboard',
  description: 'The magical dashboard for Solana DeFi liquidity providers',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="stars">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
        <WalletConnectionProvider>
          {children}
        </WalletConnectionProvider>
      </body>
    </html>
  );
} 