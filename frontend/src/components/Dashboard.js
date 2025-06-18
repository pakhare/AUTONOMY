import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "../utils/connection";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import "./Dashboard.css";

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

        let isMember = false;

        try {
          await program.account.member.fetch(memberPda);
          isMember = true;// User is a member
        } catch (_) {
          // Not a member
        }

        const isCreator = dao.account.authority.toBase58() === wallet.publicKey.toBase58();

        if (isCreator) {
          created.push(dao);
        } else if (isMember) {
          member.push(dao);
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
    <>
    <div className='home'>
        <div id="h1">
          Helping You To Create Your Community On Solana
        </div>
        <div id="h2">
          <p>Create Decentrallied Autonomous Organizations</p>
          <p>Keep Members Engaged with features like Proposal Creation and Voting</p>
        </div>
    </div>
    
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>My DAOs</h1>
        <button onClick={handleCreateDao}>
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
    </div>
    </>
  );
};

export default Dashboard; 