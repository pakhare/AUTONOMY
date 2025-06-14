import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from "@solana/web3.js";

// Create the context
const WalletContext = createContext();

// Custom hook to use the wallet context
export const useWalletContext = () => useContext(WalletContext);

// Provider component
export const WalletProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    setWallets([new PhantomWalletAdapter()]);
  }, []);

  return (
    <ConnectionProvider endpoint={clusterApiUrl("devnet")}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}; 