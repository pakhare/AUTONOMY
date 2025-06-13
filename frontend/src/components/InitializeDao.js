import React, { useState, useEffect } from "react";
import { getProgram } from "../utils/connection";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";

const InitializeDao = () => {
  const [daoName, setDaoName] = useState("");
  const [supply, setSupply] = useState("");
  const [daoInfo, setDaoInfo] = useState(null);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalRecipient, setProposalRecipient] = useState("");
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const wallet = useWallet();

  useEffect(() => {
    const fetchDao = async () => {
    
      if (!wallet.publicKey) return;
      const program = getProgram();
          const proposalsRaw = await program.account.proposal.all();
console.log("Raw Proposals:", proposalsRaw);
      const [daoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("dao"), wallet.publicKey.toBuffer()],
        program.programId
      );
      try {
        const daoAccount = await program.account.dao.fetch(daoPda);
        setDaoInfo({
          ...daoAccount,
          pubkey: daoPda.toBase58(),
        });
      } catch (err) {
        setDaoInfo(null);
      }
    };
    fetchDao();
  }, [wallet.publicKey]);

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
        console.log("Proposal PDA:", proposalPda.toBase58());
        try {
          const proposalAccount = await program.account.proposal.fetch(proposalPda);
          fetched.push({
            ...proposalAccount,
            pubkey: proposalPda.toBase58(),
          });
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
    if (!daoName.trim() || !supply || Number(supply) <= 0) {
      setError("DAO name cannot be empty and supply must be a positive number.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const program = getProgram();
      const [daoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("dao"), wallet.publicKey.toBuffer()],
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
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        mintPda,
        daoPda,
        true
      );
      await program.methods
        .initialize(daoName, new BN(supply))
        .accounts({
          dao: daoPda,
          tokenMint: mintPda,
          tokenMintAuthority: mintAuthPda,
          treasuryTokenAccount,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      const daoAccount = await program.account.dao.fetch(daoPda);
      setDaoInfo({
        ...daoAccount,
        pubkey: daoPda.toBase58(),
      });
      setDaoName("");
      setSupply("");
    } catch (error) {
      console.error("Error creating DAO:", error);
      setError("Failed to create DAO. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDao = async () => {
    if (!wallet.publicKey) return;
    try {
      const program = getProgram();
      const [daoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("dao"), wallet.publicKey.toBuffer()],
        program.programId
      );
      await program.methods
        .deleteDao()
        .accounts({
          dao: daoPda,
          authority: wallet.publicKey,
        })
        .rpc();
      alert("DAO deleted successfully.");
      setDaoInfo(null);
      setProposals([]);
    } catch (error) {
      console.error("Error deleting DAO:", error);
      alert("Failed to delete DAO. Check console for details.");
    }
  };

  const createProposal = async () => {
  if (!daoInfo || !wallet.publicKey) return;
  if (
    !proposalTitle.trim() ||
    !proposalDescription.trim() ||
    !proposalAmount ||
    Number(proposalAmount) <= 0 ||
    !proposalRecipient.trim()
  ) {
    setError("All proposal fields are required and amount must be a positive number.");
    return;
  }

  setIsLoading(true);
  setError("");

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

    console.log("Creating proposal with creator wallet:", wallet.publicKey.toBase58());

    const tx = await program.methods
      .createProposal(
        proposalTitle,
        proposalDescription,
        new BN(proposalAmount),
        new PublicKey(proposalRecipient)
      )
      .accounts({
        dao: daoPubkey,
        proposal: proposalPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      // This is key to ensure wallet signs if not auto-injected
      .rpc();

    console.log("Transaction Signature:", tx);

    alert("Proposal created successfully.");


    setProposalTitle("");
    setProposalDescription("");
    setProposalAmount("");
    setProposalRecipient("");

    const daoAccount = await program.account.dao.fetch(daoPubkey);
    setDaoInfo({
      ...daoAccount,
      pubkey: daoPubkey.toBase58(),
    });
  } catch (error) {
    console.error("Error creating proposal:", error);
    setError("Failed to create proposal. Check console for details.");
  } finally {
    setIsLoading(false);
    
  }
};


  return (
  
    <div style={{ maxWidth: "500px", margin: "auto", padding: "20px" }}>
      <h2>Initialize DAO</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        type="text"
        placeholder="DAO Name"
        value={daoName}
        onChange={(e) => setDaoName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Total Supply"
        value={supply}
        onChange={(e) => setSupply(e.target.value)}
      />
      <button onClick={initializeDao} disabled={!wallet.connected || isLoading}>
        {isLoading ? "Creating..." : "Create DAO"}
      </button>

      {daoInfo && (
        <div style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
          <h3>DAO Info</h3>
          <p><strong>Public Key:</strong> {daoInfo.pubkey ?? "N/A"}</p>
          <p><strong>Name:</strong> {daoInfo.daoName ?? "N/A"}</p>
          <p><strong>Authority:</strong> {daoInfo.authority?.toBase58?.() ?? "N/A"}</p>
          <p><strong>Token Mint:</strong> {daoInfo.tokenMint?.toBase58?.() ?? "N/A"}</p>
          <p><strong>Total Supply:</strong> {daoInfo.totalSupply?.toString?.() ?? "N/A"}</p>
          <p><strong>Proposal Count:</strong> {daoInfo.proposalCount?.toString?.() ?? "0"}</p>
          <button onClick={deleteDao} style={{ color: "white", background: "red", marginTop: "10px" }} disabled={isLoading}>
            Delete DAO
          </button>

          <div style={{ marginTop: "20px" }}>
            <h4>Create Proposal</h4>
            <input
              type="text"
              placeholder="Proposal Title"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
            />
            <textarea
              placeholder="Proposal Description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              rows={4}
            />
            <input
              type="number"
              placeholder="Proposal Amount"
              value={proposalAmount}
              onChange={(e) => setProposalAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="Recipient Public Key"
              value={proposalRecipient}
              onChange={(e) => setProposalRecipient(e.target.value)}
            />
            <button onClick={createProposal} disabled={!wallet.connected || isLoading}>
              {isLoading ? "Submitting..." : "Submit Proposal"}
            </button>
          </div>

          <div style={{ marginTop: "30px" }}>
            <h4>All Proposals</h4>
            {proposals.length === 0 ? (
              <p>No proposals found.</p>
            ) : (
              proposals.map((p, index) => {
                console.log(`Proposal #${index + 1}`, p); // 👈 This logs full proposal
                return (
                  <div key={p.pubkey} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
                    <p><strong>Proposal #{index + 1}</strong></p>
                    <p><strong>Title:</strong> {p.title ?? "N/A"}</p>
                    <p><strong>Description:</strong> {p.description ?? "N/A"}</p>
                    <p><strong>Amount:</strong> {p.amount?.toString?.() ?? "N/A"}</p>
                    <p><strong>Recipient:</strong> {p.recipient?.toBase58?.() ?? "N/A"}</p>
                    <p><strong>Creator Raw:</strong> {JSON.stringify(p.creator)}</p>
                    <p><strong>Creator:</strong> {p.creator?.toBase58 ? p.creator.toBase58() : p.creator ?? "N/A"}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InitializeDao;

