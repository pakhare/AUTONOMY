import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";

const DaoDetail = () => {
  const { daoId } = useParams();
  const [daoInfo, setDaoInfo] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: "",
    description: "",
    amount: "",
    recipient: "",
    deadline: "",
  });
  const wallet = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet.publicKey && daoId) {
      fetchDaoInfo();
    }
  }, [wallet.publicKey, daoId]);

  const fetchDaoInfo = async () => {
    try {
      const program = getProgram();
      const daoPubkey = new PublicKey(daoId);
      const daoAccount = await program.account.dao.fetch(daoPubkey);
      setDaoInfo({ ...daoAccount, pubkey: daoPubkey.toBase58() });
      fetchProposals(daoPubkey, daoAccount.proposalCount);
    } catch (err) {
      console.error("Error fetching DAO:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProposals = async (daoPubkey, count) => {
    try {
      const program = getProgram();
      const fetched = [];

      for (let i = 1; i <= count; i++) {
        const [proposalPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("proposal"),
            daoPubkey.toBuffer(),
            new BN(i).toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

        try {
          const proposalAccount = await program.account.proposal.fetch(proposalPda);
          fetched.push({ ...proposalAccount, pubkey: proposalPda.toBase58() });
        } catch (e) {
          console.warn(`Proposal ${i} not found`);
        }
      }
      setProposals(fetched);
    } catch (err) {
      console.error("Error fetching proposals:", err);
    }
  };

  const handleCreateProposal = async () => {
    if (!wallet.publicKey || !daoInfo) return;
    try {
      const program = getProgram();
      const daoPubkey = new PublicKey(daoInfo.pubkey);
      const proposalIndex = Number(daoInfo.proposalCount) + 1;
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          daoPubkey.toBuffer(),
          new BN(proposalIndex).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const unixDeadline = Math.floor(new Date(newProposal.deadline).getTime() / 1000);

      await program.methods
        .createProposal(
          newProposal.title,
          newProposal.description,
          new BN(newProposal.amount),
          new PublicKey(newProposal.recipient),
          new BN(unixDeadline)
        )
        .accounts({
          dao: daoPubkey,
          proposal: proposalPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setShowNewProposal(false);
      setNewProposal({
        title: "",
        description: "",
        amount: "",
        recipient: "",
        deadline: "",
      });
      fetchDaoInfo();
    } catch (err) {
      console.error("Error creating proposal:", err);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!daoInfo) {
    return <div>DAO not found</div>;
  }

  return (
    <div className="dao-detail">
      <div className="dao-header">
        <h1>{daoInfo.daoName}</h1>
        <button onClick={() => setShowNewProposal(true)} className="new-proposal-btn">
          New Proposal
        </button>
      </div>

      {showNewProposal && (
        <div className="new-proposal-form">
          <h2>Create New Proposal</h2>
          <input
            type="text"
            placeholder="Title"
            value={newProposal.title}
            onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
          />
          <textarea
            placeholder="Description"
            value={newProposal.description}
            onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
          />
          <input
            type="number"
            placeholder="Amount"
            value={newProposal.amount}
            onChange={(e) => setNewProposal({ ...newProposal, amount: e.target.value })}
          />
          <input
            type="text"
            placeholder="Recipient PublicKey"
            value={newProposal.recipient}
            onChange={(e) => setNewProposal({ ...newProposal, recipient: e.target.value })}
          />
          <input
            type="datetime-local"
            value={newProposal.deadline}
            onChange={(e) => setNewProposal({ ...newProposal, deadline: e.target.value })}
          />
          <div className="form-buttons">
            <button onClick={handleCreateProposal}>Submit</button>
            <button onClick={() => setShowNewProposal(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="proposals-list">
        <h2>Proposals</h2>
        {proposals.length === 0 ? (
          <p>No proposals yet.</p>
        ) : (
          proposals.map((proposal) => (
            <div
              key={proposal.pubkey}
              className="proposal-card"
              onClick={() => navigate(`/dao/${daoId}/proposal/${proposal.pubkey}`)}
            >
              <h3>{proposal.title}</h3>
              <p>{proposal.description}</p>
              <div className="proposal-stats">
                <span>Amount: {proposal.amount.toString()}</span>
                <span>Votes For: {proposal.votesFor.toString()}</span>
                <span>Votes Against: {proposal.votesAgainst.toString()}</span>
                <span>Status: {proposal.executed ? "Executed" : "Active"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .dao-detail {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dao-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .new-proposal-btn {
          padding: 0.75rem 1.5rem;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .new-proposal-form {
          background: #f5f5f5;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .new-proposal-form input,
        .new-proposal-form textarea {
          width: 100%;
          margin-bottom: 1rem;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .form-buttons {
          display: flex;
          gap: 1rem;
        }

        .proposal-card {
          padding: 1.5rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .proposal-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .proposal-stats {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          color: #666;
        }

        h1 {
          margin: 0;
        }

        h2 {
          margin-bottom: 1rem;
        }

        h3 {
          margin: 0 0 0.5rem 0;
        }
      `}</style>
    </div>
  );
};

export default DaoDetail; 