import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Dashboard from "./components/Dashboard";
import DaoDetail from "./components/DaoDetail";
import ProposalDetail from "./components/ProposalDetail";
import InitializeDao from "./components/InitializeDao";

import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="app-container">
          <header className="app-header">
            <h1><a href="/">AUTONOMY</a></h1>
            <WalletMultiButton />
          </header>
          <main className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create-dao" element={<InitializeDao />} />
              <Route path="/dao/:daoId" element={<DaoDetail />} />
              <Route path="/dao/:daoId/proposal/:proposalId" element={<ProposalDetail />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
