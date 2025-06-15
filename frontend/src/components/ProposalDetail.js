import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey } from "@solana/web3.js";

const ProposalDetail = () => {
  const { daoId, proposalId } = useParams();
  const [proposal, setProposal] = useState(null);
  const [daoInfo, setDaoInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const wallet = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet.publicKey && daoId && proposalId) {
      fetchProposalInfo();
    }
  }, [wallet.publicKey, daoId, proposalId]);

  const fetchProposalInfo = async () => {
    try {
      const program = getProgram();
      const daoPubkey = new PublicKey(daoId);
      const proposalPubkey = new PublicKey(proposalId);

      const [daoAccount, proposalAccount] = await Promise.all([
        program.account.dao.fetch(daoPubkey),
        program.account.proposal.fetch(proposalPubkey),
      ]);

      setDaoInfo({ ...daoAccount, pubkey: daoPubkey.toBase58() });
      setProposal({ ...proposalAccount, pubkey: proposalPubkey.toBase58() });
      setIsCreator(proposalAccount.creator.toBase58() === wallet.publicKey.toBase58());

      // Check if user has voted
      const [voterRecordPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("voter_record"),
          proposalPubkey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        const voterRecord = await program.account.voterRecord.fetch(voterRecordPda);
        setHasVoted(voterRecord.voted);
      } catch (_) {
        setHasVoted(false);
      }

      // TODO: Fetch comments from a separate storage (e.g., IPFS or a database)
      setComments([]);
    } catch (err) {
      console.error("Error fetching proposal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (approve) => {
    if (!wallet.publicKey || !proposal) return;
    try {
      const program = getProgram();
      const proposalPubkey = new PublicKey(proposal.pubkey);
      const daoPubkey = new PublicKey(daoId);

      const [voterRecordPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("voter_record"),
          proposalPubkey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      const [memberPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("member"),
          daoPubkey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .vote(approve)
        .accounts({
          dao: daoPubkey,
          proposal: proposalPubkey,
          voter: wallet.publicKey,
          voterRecord: voterRecordPda,
          member: memberPda,
        })
        .rpc();

      setHasVoted(true);
      fetchProposalInfo();
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const handleStatusUpdate = async () => {
    if (!status) return;
    // TODO: Implement status update logic
    // This would typically involve storing the status in IPFS or a database
    setComments([...comments, { status, comment, timestamp: new Date().toISOString() }]);
    setStatus("");
    setComment("");
  };

  const isVotingPeriodActive = () => {
    if (!proposal) return false;
    const now = Math.floor(Date.now() / 1000);
    return now <= proposal.votingDeadline.toNumber();
  };

  const handleExecuteProposal = () => {
    // Simulate execution by updating local state
    setIsExecuted(true);
    setProposal(prev => ({
      ...prev,
      executed: true
    }));
    
    // Add an execution comment
    setComments(prev => [...prev, {
      status: "Executed",
      comment: "Proposal has been executed successfully",
      timestamp: new Date().toISOString()
    }]);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!proposal) {
    return <div>Proposal not found</div>;
  }

  return (
    <div className="proposal-detail">
      <div className="proposal-header">
        <h1>{proposal.title}</h1>
        <button onClick={() => navigate(`/dao/${daoId}`)} className="back-btn">
          Back to DAO
        </button>
      </div>

      <div className="proposal-content">
        <div className="proposal-info">
          <h2>Description</h2>
          <p>{proposal.description}</p>

          <div className="proposal-stats">
            <div className="stat">
              <label>Amount:</label>
              <span>{proposal.amount.toString()}</span>
            </div>
            <div className="stat">
              <label>Recipient:</label>
              <span>{proposal.recipient.toBase58()}</span>
            </div>
            <div className="stat">
              <label>Votes For:</label>
              <span>{proposal.votesFor.toString()}</span>
            </div>
            <div className="stat">
              <label>Votes Against:</label>
              <span>{proposal.votesAgainst.toString()}</span>
            </div>
            <div className="stat">
              <label>Total Votes:</label>
              <span>{Number(proposal.votesFor) + Number(proposal.votesAgainst)}</span>
            </div>
            <div className="stat">
              <label>Required for 50%:</label>
              <span>{Math.ceil(Number(daoInfo.totalSupply) / 2)}</span>
            </div>
            <div className="stat">
              <label>Status:</label>
              <span>{
                isExecuted || proposal.executed ? "Executed" :
                Number(proposal.votesFor) > Math.ceil(Number(daoInfo.totalSupply) / 2) ? "Approved (Ready to Execute)" :
                Number(proposal.votesAgainst) > Math.ceil(Number(daoInfo.totalSupply) / 2) ? "Rejected" :
                "Active"
              }</span>
            </div>
            <div className="stat">
              <label>Deadline:</label>
              <span>{new Date(proposal.votingDeadline.toNumber() * 1000).toLocaleString()}</span>
            </div>
          </div>

          {!hasVoted && isVotingPeriodActive() && !isExecuted && !proposal.executed && (
            <div className="voting-buttons">
              <button onClick={() => handleVote(true)} className="approve-btn">
                Approve
              </button>
              <button onClick={() => handleVote(false)} className="reject-btn">
                Reject
              </button>
            </div>
          )}

          {!isExecuted && !proposal.executed && 
           Number(proposal.votesFor) > Number(proposal.votesAgainst) && (
            <div className="execute-button">
              <button onClick={handleExecuteProposal} className="execute-btn">
                Execute Proposal
              </button>
            </div>
          )}
        </div>

        {isCreator && (
          <div className="status-update">
            <h2>Update Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="status-select"
            >
              <option value="">Select Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>
            <textarea
              placeholder="Add a comment about the status..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="status-comment"
            />
            <button onClick={handleStatusUpdate} className="update-btn">
              Update Status
            </button>
          </div>
        )}

        <div className="status-history">
          <h2>Status History</h2>
          {comments.length === 0 ? (
            <p>No status updates yet.</p>
          ) : (
            comments.map((update, index) => (
              <div key={index} className="status-update-item">
                <div className="status-header">
                  <span className="status">{update.status}</span>
                  <span className="timestamp">
                    {new Date(update.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="comment">{update.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .proposal-detail {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .proposal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .back-btn {
          padding: 0.5rem 1rem;
          background-color: #666;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .proposal-content {
          display: grid;
          gap: 2rem;
        }

        .proposal-info {
          background: #f5f5f5;
          padding: 2rem;
          border-radius: 8px;
        }

        .proposal-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat label {
          font-weight: bold;
          color: #666;
        }

        .voting-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .approve-btn,
        .reject-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .approve-btn {
          background-color: #4CAF50;
          color: white;
        }

        .reject-btn {
          background-color: #f44336;
          color: white;
        }

        .status-update {
          background: #f5f5f5;
          padding: 2rem;
          border-radius: 8px;
        }

        .status-select {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .status-comment {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-height: 100px;
        }

        .update-btn {
          padding: 0.75rem 1.5rem;
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .status-history {
          background: #f5f5f5;
          padding: 2rem;
          border-radius: 8px;
        }

        .status-update-item {
          border-bottom: 1px solid #ddd;
          padding: 1rem 0;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .status {
          font-weight: bold;
          color: #2196F3;
        }

        .timestamp {
          color: #666;
        }

        .comment {
          margin: 0;
          color: #333;
        }

        h1 {
          margin: 0;
        }

        h2 {
          margin: 0 0 1rem 0;
        }

        .execute-button {
          margin-top: 1rem;
        }
        .execute-btn {
          padding: 0.5rem 1rem;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .execute-btn:hover {
          background-color: #45a049;
        }
      `}</style>
    </div>
  );
};

export default ProposalDetail; 