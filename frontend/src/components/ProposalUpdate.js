import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const ProposalUpdate = ({ proposal, daoInfo }) => {
  const wallet = useWallet();

  const [isCreator, setIsCreator] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState("");
  const [statusTag, setStatusTag] = useState("In Progress");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (proposal && wallet?.publicKey && daoInfo) {
      const addr = wallet.publicKey.toBase58();
      const creatorAddr = proposal.creator?.toBase58?.() ?? proposal.creator ?? "";
      setIsCreator(addr === creatorAddr);

      const now = Date.now() / 1000;
      const deadline = Number(proposal.votingDeadline.toNumber());
      const votesFor = Number(proposal.votesFor);
      const votesAgainst = Number(proposal.votesAgainst);
      const totalVotes = votesFor + votesAgainst;
      const totalMembers = daoInfo.totalMembers || 0;
      const quorumRequired = Math.ceil(totalMembers * 0.6);

      let approved = false;
      if (proposal.executed) approved = true;
      else if (now >= deadline || totalVotes >= totalMembers) {
        approved = votesFor > totalVotes / 2;
      }

      setIsApproved(approved);
    }
  }, [proposal, wallet, daoInfo]);

  useEffect(() => {
    if (!proposal?.pubkey) return;

    fetch(`${process.env.REACT_APP_API_URL}/status/${proposal.pubkey}`)
      .then(res => res.ok && res.json())
      .then(data => {
        if (data?.uploads) setUploadHistory(data.uploads);
      })
      .catch(() => {});
  }, [proposal]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError("");

    try {
      const signRes = await fetch(`${process.env.REACT_APP_API_URL}/sign-s3-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      const { signedUrl, fileUrl } = await signRes.json();
      if (!signedUrl || !fileUrl) throw new Error("Failed to get signed URL");

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!uploadRes.ok) throw new Error("File upload failed");

      const saveRes = await fetch(`${process.env.REACT_APP_API_URL}/save-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.pubkey,
          fileUrl,
          creator: wallet.publicKey.toBase58(),
          note,
          statusTag,
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to save status");

      setUploadHistory(prev => [...prev, { fileUrl, note, statusTag, timestamp: Date.now() }]);
      setSelectedFile(null);
      setNote("");
      setStatusTag("In Progress");
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  if (!proposal) return null;

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-semibold mb-2">Updates</h2>
      <p className="mb-2">
        <strong>Creator:</strong>{" "}
        <span className="text-blue-600">
          {proposal.creator?.toBase58?.() ?? proposal.creator ?? ""}
        </span>
      </p>

      {isCreator && isApproved ? (
        <div className="p-4 bg-gray-50 rounded">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.txt,.pdf,.csv,.docx,.zip"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="mb-3"
          />

          <textarea
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border p-2 mb-3"
          />

          <select
            value={statusTag}
            onChange={(e) => setStatusTag(e.target.value)}
            className="w-full border p-2 mb-3"
          >
            <option>In Progress</option>
            <option>Completed</option>
            <option>Partially Done</option>
            <option>Abandoned</option>
          </select>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </button>

          {error && <p className="mt-2 text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded text-gray-600">
          {isCreator ? (
            <p>The proposal is not approved yet. You can upload a status file once approved.</p>
          ) : (
            <p>Only the proposal creator can upload status files after approval.</p>
          )}
        </div>
      )}

      {uploadHistory?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Upload History</h3>
          <ul className="space-y-3">
            {uploadHistory.map((u, idx) => (
              <li key={idx} className="border p-3 rounded">
                <p>
                  <strong>Status:</strong> {u.statusTag} |{" "}
                  <strong>Uploaded:</strong>{" "}
                  {new Date(u.timestamp).toLocaleString()}
                </p>
                {u.note && <p className="mt-1 text-gray-700">Note: {u.note}</p>}
                {u.fileUrl.endsWith(".txt") || u.fileUrl.endsWith(".pdf") || u.fileUrl.endsWith(".csv") || u.fileUrl.endsWith(".docx") || u.fileUrl.endsWith(".zip") ? (
                  <a href={u.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    View File
                  </a>
                ) : (
                  <img src={u.fileUrl} alt="Uploaded File" className="mt-2 border max-w-md" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProposalUpdate;
