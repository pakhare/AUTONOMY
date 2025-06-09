import React, { useEffect, useState } from "react";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from "@solana/web3.js";
import InitializeDao from "./components/InitializeDao";

import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    setWallets([new PhantomWalletAdapter()]);
  }, []);

  return (
    <ConnectionProvider endpoint={clusterApiUrl("devnet")}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <h1>My DAO</h1>
            <WalletMultiButton />
          </div>
          <InitializeDao />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
