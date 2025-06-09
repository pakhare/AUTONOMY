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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const wallet = useWallet();

  useEffect(() => {
    const fetchDao = async () => {
      if (!wallet.publicKey) return;
      const program = getProgram();
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
          treasuryTokenAccount: treasuryTokenAccount,
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
    } catch (error) {
      console.error("Error deleting DAO:", error);
      alert("Failed to delete DAO. Check console for details.");
    }
  };

  const createProposal = async () => {
    if (!daoInfo || !wallet.publicKey) return;
    if (!proposalTitle.trim() || !proposalDescription.trim() || !proposalAmount || Number(proposalAmount) <= 0 || !proposalRecipient.trim()) {
      setError("All proposal fields are required and amount must be a positive number.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const program = getProgram();
      const daoPubkey = new PublicKey(daoInfo.pubkey);
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proposal"), daoPubkey.toBuffer(), new BN(daoInfo.proposalCount).toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      await program.methods
        .createProposal(proposalTitle, proposalDescription, new BN(proposalAmount), new PublicKey(proposalRecipient))
        .accounts({
          dao: daoPubkey,
          proposal: proposalPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      alert("Proposal created successfully.");
      setProposalTitle("");
      setProposalDescription("");
      setProposalAmount("");
      setProposalRecipient("");
    } catch (error) {
      console.error("Error creating proposal:", error);
      setError("Failed to create proposal. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
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
          <p><strong>Public Key:</strong> {daoInfo.pubkey}</p>
          <p><strong>Name:</strong> {daoInfo.daoName}</p>
          <p><strong>Authority:</strong> {daoInfo.authority.toBase58()}</p>
          <p><strong>Token Mint:</strong> {daoInfo.tokenMint.toBase58()}</p>
          <p><strong>Total Supply:</strong> {daoInfo.totalSupply.toString()}</p>
          <p><strong>Proposal Count:</strong> {daoInfo.proposalCount.toString()}</p>
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
        </div>
      )}
    </div>
  );
};

export default InitializeDao;
