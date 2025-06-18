// frontend/src/components/ProposalUpdate.js
import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import ProposalUpdateHTML from "./ProposalUpdate.html";

const ProposalUpdate = ({ proposal, daoInfo }) => {
  const wallet = useWallet();

  const [isCreator, setIsCreator] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Determine creator + approval
  useEffect(() => {
    if (proposal && wallet?.publicKey && daoInfo) {
      const addr = wallet.publicKey.toBase58();
      // proposal.creator may be a PublicKey object
      let creatorAddr = proposal.creator?.toBase58 ? proposal.creator.toBase58() : proposal.creator;
      setIsCreator(addr === creatorAddr);
      // Approval logic: more than half of totalSupply
      const votesFor = Number(proposal.votesFor);
      const totalSupply = Number(daoInfo.totalSupply);
      setIsApproved(votesFor > Math.ceil(totalSupply / 2));
    }
  }, [proposal, wallet, daoInfo]);

  // Fetch stored file URL if any
  useEffect(() => {
    if (!proposal?.id) return;

    fetch(`${process.env.REACT_APP_API_URL}/status/${proposal.id}`)
      .then((r) => r.ok && r.json())
      .then((data) => data && setUploadedUrl(data.fileUrl))
      .catch(() => {});
  }, [proposal]);

  // Upload flow: signed URL → S3 → save to Mongo
  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError("");

    try {
      // Signed URL
      const signRes = await fetch(`${process.env.REACT_APP_API_URL}/sign-s3-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });
      const { signedUrl, fileUrl } = await signRes.json();

      // Upload to S3
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      setUploadedUrl(fileUrl);

      // Save to DB
      const saveRes = await fetch(`${process.env.REACT_APP_API_URL}/save-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          fileUrl,
          creator: wallet.publicKey.toBase58(),
        }),
      });
      if (!saveRes.ok) throw new Error("Save failed");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ProposalUpdateHTML
      proposal={proposal}
      isApproved={isApproved}
      isCreator={isCreator}
      selectedFile={selectedFile}
      setSelectedFile={setSelectedFile}
      handleUpload={handleUpload}
      isUploading={isUploading}
      uploadedUrl={uploadedUrl}
      error={error}
    />
  );
};

export default ProposalUpdate;