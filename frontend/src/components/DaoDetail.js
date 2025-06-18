import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import "./DaoDetail.css";

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
      // Validate date
      if (!newProposal.deadline) {
        throw new Error("Please select a deadline");
      }

      const selectedDate = new Date(newProposal.deadline);
      const now = new Date();
      
      // Add 1 minute buffer to account for processing time
      now.setMinutes(now.getMinutes() + 1);
      
      if (selectedDate <= now) {
        throw new Error("Deadline must be at least 1 minute in the future");
      }

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

      // Get member PDA
      const [memberPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("member"),
          daoPubkey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Convert to Unix timestamp (seconds)
      const unixDeadline = Math.floor(selectedDate.getTime() / 1000);

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
          member: memberPda,
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
      alert(err.message || "Failed to create proposal");
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
        <div className="proposal-btns">
          <button>
          Proposal Updates
        </button>
        <button onClick={() => setShowNewProposal(true)} >
          New Proposal
        </button>
        </div>

      </div>

      {showNewProposal && (
        <div className="new-proposal-form">
          <h2>Create New Proposal</h2>
          <label>Enter a title for proposal</label><br/><br/>
          <input
            type="text"
            placeholder=" Proposal Title"
            value={newProposal.title}
            onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
          />
          <br/><label>Describe your proposal</label>
          <textarea
            placeholder="Description"
            value={newProposal.description}
            onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
          />
          <br/><label>Enter the amount</label>
          <input
            type="number"
            placeholder="Amount"
            value={newProposal.amount}
            onChange={(e) => setNewProposal({ ...newProposal, amount: e.target.value })}
          />
          <br/><label>Enter wallet address of Recipient</label>
          <input
            type="text"
            placeholder="Recipient PublicKey"
            value={newProposal.recipient}
            onChange={(e) => setNewProposal({ ...newProposal, recipient: e.target.value })}
          />
          <br/><label>End Date and Time of Proposal</label>
          <input
            type="datetime-local"
            value={newProposal.deadline}
            onChange={(e) => {
              const selectedDate = new Date(e.target.value);
              const now = new Date();
              now.setMinutes(now.getMinutes() + 1); // Add 1 minute buffer
              
              if (selectedDate > now) {
                setNewProposal({ ...newProposal, deadline: e.target.value });
              } else {
                alert("Please select a date at least 1 minute in the future");
              }
            }}
            min={new Date(new Date().getTime() + 60000).toISOString().slice(0, 16)} // Current time + 1 minute
            style={{ color:'white', padding: '8px', marginBottom: '10px' }}
          />
          <div className="form-buttons">
            <button onClick={() => setShowNewProposal(false)}>Cancel</button>
            <button onClick={handleCreateProposal}>Submit</button>
          </div>
        </div>
      )}

      <div className="proposals-list">
        <h2 style={{margin:' 3% 0%'}}>Proposals</h2>
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
    </div>
  );
};

export default DaoDetail; 