import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import "./DaoDetail.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getProposalStatus } from "../utils/proposalUtils";

const DaoDetail = () => {
  const { daoId } = useParams();
  const [daoInfo, setDaoInfo] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [members, setMembers] = useState([]);
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
      fetchMembers(daoId);
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
          [Buffer.from("proposal"), daoPubkey.toBuffer(), new BN(i).toArrayLike(Buffer, "le", 8)],
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

  const fetchMembers = async (daoId) => {
    try {
      const program = getProgram();
      const connection = program.provider.connection;
      const daoPubkey = new PublicKey(daoId);
      const MEMBER_ACCOUNT_SIZE = 8 + 32 + 32;

      const filters = [
        { dataSize: MEMBER_ACCOUNT_SIZE },
        {
          memcmp: {
            offset: 8,
            bytes: daoPubkey.toBase58(),
          },
        },
      ];

      const accounts = await connection.getProgramAccounts(program.programId, { filters });
      const memberWallets = accounts.map((acc) => new PublicKey(acc.account.data.slice(40, 72)).toBase58());
      setMembers(memberWallets);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const handleCreateProposal = async () => {
    if (!wallet.publicKey || !daoInfo) return;
    try {
      if (!newProposal.deadline) throw new Error("Please select a deadline");
      const selectedDate = new Date(newProposal.deadline);
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      if (selectedDate <= now) throw new Error("Deadline must be at least 1 minute in the future");

      const program = getProgram();
      const daoPubkey = new PublicKey(daoInfo.pubkey);
      const proposalIndex = Number(daoInfo.proposalCount) + 1;
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proposal"), daoPubkey.toBuffer(), new BN(proposalIndex).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const [memberPda] = await PublicKey.findProgramAddress(
        [Buffer.from("member"), daoPubkey.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      const unixDeadline = Math.floor(selectedDate.getTime() / 1000);

      await program.methods
        .createProposal(newProposal.title, newProposal.description, new BN(newProposal.amount), new PublicKey(newProposal.recipient), new BN(unixDeadline))
        .accounts({ dao: daoPubkey, proposal: proposalPda, member: memberPda, authority: wallet.publicKey, systemProgram: SystemProgram.programId })
        .rpc();

      setShowNewProposal(false);
      setNewProposal({ title: "", description: "", amount: "", recipient: "", deadline: "" });
      fetchDaoInfo();
    } catch (err) {
      console.error("Error creating proposal:", err);
      alert(err.message || "Failed to create proposal");
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!daoInfo) return <div>DAO not found</div>;

  return (
    <div className="dao-detail-container">
      <div className="dao-main-content">
        <div className="dao-header">
          <h1>{daoInfo.daoName}</h1>
          <button onClick={() => setShowNewProposal(true)}>New Proposal</button>
        </div>

        {showNewProposal && (
          <div className="new-proposal-form">
            <h2>Create New Proposal</h2>
            <input type="text" placeholder="Proposal Title" value={newProposal.title} onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })} />
            <textarea placeholder="Description" value={newProposal.description} onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })} />
            <input type="number" placeholder="Amount" value={newProposal.amount} onChange={(e) => setNewProposal({ ...newProposal, amount: e.target.value })} />
            <input type="text" placeholder="Recipient PublicKey" value={newProposal.recipient} onChange={(e) => setNewProposal({ ...newProposal, recipient: e.target.value })} />
            {/* <input type="datetime-local" value={newProposal.deadline} onChange={(e) => setNewProposal({ ...newProposal, deadline: e.target.value })} /> */}
            <DatePicker
  selected={newProposal.deadline ? new Date(newProposal.deadline) : null}
  onChange={(date) => setNewProposal({ ...newProposal, deadline: date })}
  showTimeSelect
  dateFormat="Pp"
  placeholderText="Select deadline"
/>

            <br></br><br></br>
            <div className="form-buttons">
              <button onClick={() => setShowNewProposal(false)}>Cancel</button>
              <button onClick={handleCreateProposal}>Submit</button>
            </div>
          </div>
        )}

        <br></br><br></br><br></br><br></br>

        <div className="proposals-list">
          <h2>Proposals</h2>
          {proposals.length === 0 ? <p>No proposals yet.</p> : proposals.map((proposal) => (
            <div key={proposal.pubkey} className="proposal-card" onClick={() => navigate(`/dao/${daoId}/proposal/${proposal.pubkey}`)}>
              <h3>{proposal.title}</h3>
              <p>{proposal.description}</p>
              <div className="proposal-stats">
                <span>Amount: {proposal.amount.toString()}</span>
                <span>Votes For: {proposal.votesFor.toString()}</span>
                <span>Votes Against: {proposal.votesAgainst.toString()}</span>
                {/* <span>{proposal.executed ? "Executed" : Date.now() / 1000 < proposal.votingDeadline ? "Active" : proposal.votesFor > (proposal.votesFor + proposal.votesAgainst) / 2 ? "Approved" : "Rejected"}</span> */}

                <span>{getProposalStatus(proposal, daoInfo)}</span>              </div>
            </div>
          ))}
        </div>
      </div>
<br></br><br></br>
      <div className="dao-sidebar">
        <h3>DAO Members</h3>
        {members.length === 0 ? <p>No members found.</p> : (
          <ul>
            {members.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DaoDetail;
