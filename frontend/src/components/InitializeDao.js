""// ./components/InitializeDao.js
import React, { useState, useEffect } from "react";
import { getProgram } from "../utils/connection";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import BN from "bn.js";

const InitializeDao = () => {
  const [daoId, setDaoId] = useState(() => {
    const urlParam = new URLSearchParams(window.location.search).get("daoId");
    if (urlParam) return new BN(urlParam);
    const newId = new BN(Date.now());
    window.history.replaceState({}, "", `?daoId=${newId.toString()}`);
    return newId;
  });

  const [daoName, setDaoName] = useState("");
  const [supply, setSupply] = useState("");
  const [memberList, setMemberList] = useState("");
  const [daoInfo, setDaoInfo] = useState(null);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalRecipient, setProposalRecipient] = useState("");
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const wallet = useWallet();
  const [proposalDeadline, setProposalDeadline] = useState("");
  
  const [myDaos, setMyDaos] = useState([]);

const fetchMyDaos = async () => {
  if (!wallet.publicKey) return;
  try {
    const program = getProgram();
    const allDaos = await program.account.dao.all();

    const relevantDaos = [];

    for (const dao of allDaos) {
      const daoPda = dao.publicKey;
      const [memberPda] = await PublicKey.findProgramAddress(
        [Buffer.from("member"), daoPda.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.account.member.fetch(memberPda);
        relevantDaos.push(dao); // User is a member
      } catch (_) {
        if (dao.account.authority.toBase58() === wallet.publicKey.toBase58()) {
          relevantDaos.push(dao); // User is the creator
        }
      }
    }

    setMyDaos(relevantDaos);
  } catch (err) {
    console.error("Error fetching my DAOs:", err);
  }
};




  useEffect(() => {
    if (!wallet.publicKey) return;
    const fetchDao = async () => {
      try {
      
        const program = getProgram();
        const [daoPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("dao"),
            wallet.publicKey.toBuffer(),
            new BN(daoId).toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );
        const daoAccount = await program.account.dao.fetch(daoPda);
        setDaoInfo({ ...daoAccount, pubkey: daoPda.toBase58() });
      } catch (e) {
        console.warn("DAO not found for daoId", daoId.toString());
        setDaoInfo(null);
      }
    };
    fetchDao();
  }, [wallet.publicKey, daoId]);

  useEffect(() => {
    if (daoInfo) fetchProposals();
  }, [daoInfo]);

  const fetchProposals = async () => {
    try {
      const program = getProgram();
      const daoPubkey = new PublicKey(daoInfo.pubkey);
      const count = Number(daoInfo.proposalCount ?? 0);
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
        console.log("📌 Proposal PDA:", proposalPda.toBase58());
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

  const initializeDao = async () => {
    if (!daoName || !supply || !wallet.publicKey || !memberList) return;
    setIsLoading(true);
    try {
      const program = getProgram();
      const [daoPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("dao"),
          wallet.publicKey.toBuffer(),
          new BN(daoId).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
      const [mintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_mint"), daoPda.toBuffer()],
        program.programId
      );
      const [mintAuthPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_auth"), daoPda.toBuffer()],
        program.programId
      );
      const [memberListPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("member_list"), daoPda.toBuffer()],
        program.programId
      );
      const treasuryTokenAccount = await getAssociatedTokenAddress(mintPda, daoPda, true);

      const parsedMemberList = memberList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((key) => new PublicKey(key));

      await program.methods
        .initialize(daoId, daoName, new BN(supply))
        .accounts({
          dao: daoPda,
          tokenMint: mintPda,
          tokenMintAuthority: mintAuthPda,
          treasuryTokenAccount,
          memberList: memberListPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      for (const member of parsedMemberList) {
        const [memberPda] = await PublicKey.findProgramAddress(
          [Buffer.from("member"), daoPda.toBuffer(), member.toBuffer()],
          program.programId
        );

        await program.methods
          .addMember()
          .accounts({
            dao: daoPda,
            member: memberPda,
            newMember: member,
            authority: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      const daoAccount = await program.account.dao.fetch(daoPda);
      setDaoInfo({ ...daoAccount, pubkey: daoPda.toBase58() });
    } catch (error) {
      console.error("Error creating DAO:", error);
      setError("Failed to create DAO. See console.");
    } finally {
      setIsLoading(false);
    }
  };

  const createProposal = async () => {
    if (!daoInfo || !wallet.publicKey) return;
    setIsLoading(true);
    try {
      const program = getProgram();
      const daoPubkey = new PublicKey(daoInfo.pubkey);
      const proposalIndex = Number(daoInfo.proposalCount ?? 0) + 1;
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          daoPubkey.toBuffer(),
          new BN(proposalIndex).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

const unixDeadline = Math.floor(new Date(proposalDeadline).getTime() / 1000); // convert to i64

await program.methods
  .createProposal(
    proposalTitle,
    proposalDescription,
    new BN(proposalAmount),
    new PublicKey(proposalRecipient),
    new BN(unixDeadline)
  )
  .accounts({
    dao: daoPubkey,
    proposal: proposalPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();



      const daoAccount = await program.account.dao.fetch(daoPubkey);
      setDaoInfo({ ...daoAccount, pubkey: daoPubkey.toBase58() });
      setProposalTitle("");
      setProposalDescription("");
      setProposalAmount("");
      setProposalRecipient("");
      fetchProposals();
    } catch (err) {
      console.error("Error creating proposal:", err);
      setError("Failed to create proposal. See console.");
    } finally {
      setIsLoading(false);
    }
  };

const handleVote = async (proposalPubkeyBase58, approve) => {
  if (!wallet.publicKey || !daoInfo?.tokenMint) return;
  setIsLoading(true);
  try {
    const program = getProgram();
    const proposalPubkey = new PublicKey(proposalPubkeyBase58);
    const tokenMint = new PublicKey(daoInfo.tokenMint);
    const daoPubkey = new PublicKey(daoInfo.pubkey);

    const ata = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
    const ataInfo = await program.provider.connection.getAccountInfo(ata);

    if (!ataInfo) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          ata,
          wallet.publicKey,
          tokenMint
        )
      );
      await program.provider.sendAndConfirm(tx, []);
      console.log("Created associated token account");
    }

    const tokenAccountInfo = await getAccount(program.provider.connection, ata);
    const voterWeight = new BN(tokenAccountInfo.amount.toString());

    // ✅ Derive voterRecord PDA
    const [voterRecordPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("voter_record"),
        proposalPubkey.toBuffer(),
        wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    // ✅ Derive member PDA
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
        voterTokenAccount: ata,
        voter: wallet.publicKey,
        voterRecord: voterRecordPda,
        member: memberPda, // ✅ Add this
      })
      .rpc();

    alert("Vote submitted!");
    const daoAccount = await program.account.dao.fetch(daoPubkey);
    setDaoInfo({ ...daoAccount, pubkey: daoPubkey.toBase58() });
    fetchProposals();
    
    
  } catch (err) {
    console.error("Error voting:", err);
    setError("Failed to vote. See console.");
  } finally {
    setIsLoading(false);
  }
};

const handleExecuteProposal = async (proposalPubkeyBase58) => {
  if (!wallet.publicKey || !daoInfo) return;
  setIsLoading(true);
  try {
    const program = getProgram();
    const proposalPubkey = new PublicKey(proposalPubkeyBase58);
    const daoPubkey = new PublicKey(daoInfo.pubkey);
    const tokenMint = new PublicKey(daoInfo.tokenMint);
    const recipient = new PublicKey(proposals.find(p => p.pubkey === proposalPubkeyBase58).recipient);

    // Get treasury token account
    const treasuryTokenAccount = await getAssociatedTokenAddress(tokenMint, daoPubkey, true);
    
    // Get recipient token account
    const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipient);

    await program.methods
      .executeProposal()
      .accounts({
        proposal: proposalPubkey,
        dao: daoPubkey,
        treasuryTokenAccount,
        recipientTokenAccount,
        daoAuthority: daoPubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    alert("Proposal executed successfully!");
    fetchProposals();
  } catch (err) {
    console.error("Error executing proposal:", err);
    setError("Failed to execute proposal. See console.");
  } finally {
    setIsLoading(false);
  }
};




  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "20px" }}>
      <h2>Initialize DAO</h2>
      <input type="text" placeholder="DAO Name" value={daoName} onChange={(e) => setDaoName(e.target.value)} />
      <input type="number" placeholder="Token Supply" value={supply} onChange={(e) => setSupply(e.target.value)} />
      <textarea
        placeholder="Comma-separated member public keys"
        value={memberList}
        onChange={(e) => setMemberList(e.target.value)}
        style={{ width: "100%", height: "60px", marginTop: "10px" }}
      />
      <button onClick={initializeDao} disabled={isLoading}>
        {isLoading ? "Creating..." : "Create DAO"}
      </button>
      
      <hr style={{ margin: "20px 0" }} />
<button onClick={fetchMyDaos} disabled={!wallet.publicKey}>
  View My DAOs
</button>

{myDaos.length > 0 && (
  <div style={{ marginTop: "20px" }}>
    <h3>My DAOs</h3>
    {myDaos.map(({ publicKey, account }) => (
      <div
        key={publicKey.toBase58()}
        style={{
          border: "1px solid gray",
          marginBottom: "10px",
          padding: "10px",
          borderRadius: "8px",
          background: "#f9f9f9",
        }}
      >
        <p><strong>Name:</strong> {account.daoName}</p>
        <p><strong>Authority:</strong> {account.authority.toBase58()}</p>
        <p><strong>Proposals:</strong> {account.proposalCount.toString()}</p>
        <p><strong>Token Mint:</strong> {account.tokenMint.toBase58()}</p>
        <p><strong>DAO Pubkey:</strong> {publicKey.toBase58()}</p>
      </div>
    ))}
  </div>
)}


      {error && <p style={{ color: "red" }}>{error}</p>}
      
      

      {daoInfo && (
        <>
          <h3>DAO Info</h3>
          <p><strong>Name:</strong> {daoInfo.daoName}</p>
          <p><strong>Authority:</strong> {daoInfo.authority?.toBase58?.()}</p>
          <p><strong>Token Mint:</strong> {daoInfo.tokenMint?.toBase58?.()}</p>
          <p><strong>Proposals:</strong> {daoInfo.proposalCount?.toString?.()}</p>

          <h3>Create Proposal</h3>
          <input type="text" placeholder="Title" value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} />
          <textarea placeholder="Description" value={proposalDescription} onChange={(e) => setProposalDescription(e.target.value)} />
          <input type="number" placeholder="Amount" value={proposalAmount} onChange={(e) => setProposalAmount(e.target.value)} />
          <input type="text" placeholder="Recipient PublicKey" value={proposalRecipient} onChange={(e) => setProposalRecipient(e.target.value)} />
          <input
  type="datetime-local"
  value={proposalDeadline}
  onChange={(e) => setProposalDeadline(e.target.value)}
  placeholder="Voting Deadline"
/>
          <button onClick={createProposal} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Proposal"}
          </button>

          <div style={{ marginTop: "30px" }}>
            <h4>All Proposals</h4>
            {proposals.length === 0 ? (
              <p>No proposals found.</p>
            ) : (
              proposals.map((p, index) => {
                const totalVotes = Number(p.votesFor) + Number(p.votesAgainst);
                const halfMembers = Math.ceil(Number(daoInfo.totalSupply) / 2);
                const isApproved = Number(p.votesFor) > halfMembers;
                const isRejected = Number(p.votesAgainst) > halfMembers;
                const showExecuteButton = !p.executed && Number(p.votesFor) > Number(p.votesAgainst);

                return (
                  <div key={p.pubkey} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
                    <p><strong>Proposal #{index + 1}</strong></p>
                    <p><strong>Title:</strong> {p.title ?? "N/A"}</p>
                    <p><strong>Description:</strong> {p.description ?? "N/A"}</p>
                    <p><strong>Amount:</strong> {p.amount?.toString?.() ?? "N/A"}</p>
                    <p><strong>Recipient:</strong> {p.recipient?.toBase58?.() ?? "N/A"}</p>
                    <p><strong>Votes For:</strong> {p.votesFor?.toString?.() ?? "0"}</p>
                    <p><strong>Votes Against:</strong> {p.votesAgainst?.toString?.() ?? "0"}</p>
                    <p><strong>Total Votes:</strong> {totalVotes}</p>
                    <p><strong>Required for 50%:</strong> {halfMembers}</p>
                    <p><strong>Status:</strong> {
                      p.executed ? "Executed" :
                      isApproved ? "Approved (Ready to Execute)" :
                      isRejected ? "Rejected" :
                      "Active"
                    }</p>
                    {!p.executed && (
                      <>
                        <button onClick={() => handleVote(p.pubkey, true)}>✅ Approve</button>
                        <button onClick={() => handleVote(p.pubkey, false)}>❌ Reject</button>
                        {showExecuteButton && (
                          <button onClick={() => handleExecuteProposal(p.pubkey)}>Execute Proposal</button>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InitializeDao;

