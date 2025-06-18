// frontend/src/components/ProposalUpdate.html.js
import React from "react";

const ProposalUpdateHTML = ({
  proposal,
  isApproved,
  isCreator,
  selectedFile,
  setSelectedFile,
  handleUpload,
  isUploading,
  uploadedUrl,
  error,
}) => {
  if (!proposal) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-2">{proposal.title}</h2>
      <p className="mb-4">{proposal.description}</p>

      <p>
        <strong>Creator: </strong>
        <span className="text-blue-600">{proposal.creator && proposal.creator.toBase58 ? proposal.creator.toBase58() : proposal.creator?.toString?.() ?? ""}</span>
      </p>
      <p>
        <strong>For: </strong>{proposal.votesFor?.toString?.() ?? proposal.votesFor} — <strong>Against: </strong>{proposal.votesAgainst?.toString?.() ?? proposal.votesAgainst}
      </p>
      <p className="mt-2">
        <strong>Status: </strong>
        <span className={isApproved ? "text-green-600" : "text-red-600"}>
          {isApproved ? "Approved" : "Rejected"}
        </span>
      </p>

      {isCreator && isApproved ? (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">Update Proposal Status</h3>

          <input
            type="file"
            accept=".png,.jpg,.jpeg,.txt"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="mb-3"
          />

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </button>

          {error && <p className="mt-2 text-red-600">{error}</p>}

          {uploadedUrl && (
            <div className="mt-4">
              <p className="font-medium text-green-700">Uploaded successfully!</p>
              {uploadedUrl.endsWith(".txt") ? (
                <a
                  href={uploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  View File
                </a>
              ) : (
                <img src={uploadedUrl} alt="Uploaded file" className="mt-2 border max-w-md" />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 p-4 bg-gray-50 rounded-md text-gray-500 text-center">
          {isCreator && !isApproved && (
            <span>The proposal is not yet approved. You can upload a status file once it is approved by the DAO.</span>
          )}
          {!isCreator && isApproved && (
            <span>Only the proposal creator can upload a status file.</span>
          )}
          {!isCreator && !isApproved && (
            <span>Only the proposal creator can upload a status file, and the proposal must be approved.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProposalUpdateHTML;