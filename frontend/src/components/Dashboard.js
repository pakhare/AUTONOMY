import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const Dashboard = () => {
  const [createdDaos, setCreatedDaos] = useState([]);
  const [memberDaos, setMemberDaos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const wallet = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (wallet.publicKey) {
      fetchDaos();
    }
  }, [wallet.publicKey]);

  const fetchDaos = async () => {
    try {
      const program = getProgram();
      const allDaos = await program.account.dao.all();

      const created = [];
      const member = [];

      for (const dao of allDaos) {
        const daoPda = dao.publicKey;
        const [memberPda] = await PublicKey.findProgramAddress(
          [Buffer.from("member"), daoPda.toBuffer(), wallet.publicKey.toBuffer()],
          program.programId
        );

        try {
          await program.account.member.fetch(memberPda);
          member.push(dao); // User is a member
        } catch (_) {
          if (dao.account.authority.toBase58() === wallet.publicKey.toBase58()) {
            created.push(dao); // User is the creator
          }
        }
      }

      setCreatedDaos(created);
      setMemberDaos(member);
    } catch (err) {
      console.error("Error fetching DAOs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDao = () => {
    const newId = new BN(Date.now());
    navigate(`/create-dao?daoId=${newId.toString()}`);
  };

  const handleDaoClick = (dao) => {
    navigate(`/dao/${dao.publicKey.toBase58()}`);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>My DAOs</h1>
        <button onClick={handleCreateDao} className="create-dao-btn">
          Create New DAO
        </button>
      </div>

      <div className="dashboard-sections">
        <section className="created-daos">
          <h2>Created DAOs</h2>
          {createdDaos.length === 0 ? (
            <p>You haven't created any DAOs yet.</p>
          ) : (
            <div className="dao-grid">
              {createdDaos.map((dao) => (
                <div
                  key={dao.publicKey.toBase58()}
                  className="dao-card"
                  onClick={() => handleDaoClick(dao)}
                >
                  <h3>{dao.account.daoName}</h3>
                  <p>Proposals: {dao.account.proposalCount.toString()}</p>
                  <p>Total Supply: {dao.account.totalSupply.toString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="member-daos">
          <h2>Joined DAOs</h2>
          {memberDaos.length === 0 ? (
            <p>You haven't joined any DAOs yet.</p>
          ) : (
            <div className="dao-grid">
              {memberDaos.map((dao) => (
                <div
                  key={dao.publicKey.toBase58()}
                  className="dao-card"
                  onClick={() => handleDaoClick(dao)}
                >
                  <h3>{dao.account.daoName}</h3>
                  <p>Proposals: {dao.account.proposalCount.toString()}</p>
                  <p>Total Supply: {dao.account.totalSupply.toString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .dashboard {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .create-dao-btn {
          padding: 0.75rem 1.5rem;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .create-dao-btn:hover {
          background-color: #45a049;
        }

        .dashboard-sections {
          display: grid;
          gap: 2rem;
        }

        .dao-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .dao-card {
          padding: 1.5rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .dao-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        h1 {
          font-size: 2rem;
          margin: 0;
        }

        h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        h3 {
          margin: 0 0 0.5rem 0;
        }

        p {
          margin: 0.25rem 0;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default Dashboard; 