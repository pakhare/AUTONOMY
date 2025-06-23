import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey } from "@solana/web3.js";
import "./Proposal.css";
import ProposalUpdate from "./ProposalUpdate";


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

      const members = await program.account.member.all([
        {
          memcmp: {
            offset: 8, // Discriminator is 8 bytes, dao field starts right after
            bytes: daoPubkey.toBase58(),
          },
        },
      ]);
      
      const totalMembers = members.length;
      
    
      console.log("members", totalMembers);
      setDaoInfo((prev) => ({ ...prev, totalMembers }));
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
              <label>Status:</label>
              <span>{
              isExecuted || proposal.executed
              ? "Executed"
            : (() => {
            const now = Date.now() / 1000;
            const deadline = Number(proposal.votingDeadline.toNumber());
            const votesFor = Number(proposal.votesFor);
            const votesAgainst = Number(proposal.votesAgainst);
            const totalVotes = votesFor + votesAgainst;
            const totalMembers = daoInfo.totalMembers || 0;
            const quorumRequired = Math.ceil(totalMembers * 0.6); 
            
            if (now < deadline && totalVotes < totalMembers) {
              return "Active";
            }
            
            if (totalVotes >= quorumRequired || totalVotes === totalMembers) {
              if (votesFor > totalVotes / 2) {
                return "Approved";
              } else {
                return "Rejected";
              }
            }
            
            return "Quorum Not Met";
      })()
  }
</span>

            </div>
            
            <div className="stat">
              <label>Deadline:</label>
              <span>{new Date(proposal.votingDeadline.toNumber() * 1000).toLocaleString()}</span>
            </div>
            <div className="stat">
          
          </div>
            <br/>
            <br/>
            <br/>

            <div className="stat">
              <label>Recipient Address:</label>
              <span>{proposal.recipient.toBase58()}</span>
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
      <div className="status-history">
      <ProposalUpdate proposal={proposal} daoInfo={daoInfo} />
      </div>

    </div>
  );
};

export default ProposalDetail; 