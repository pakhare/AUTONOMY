import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@project-serum/anchor';
import idl from '../idl/newdapp.json';

const getProvider = () => {
  const connection = new Connection("http://localhost:8899");

  // ✅ Make sure wallet is compatible with Anchor
  const wallet = {
    signTransaction: window.solana.signTransaction.bind(window.solana),
    signAllTransactions: window.solana.signAllTransactions.bind(window.solana),
    publicKey: window.solana.publicKey,
  };

  const provider = new AnchorProvider(
    connection,
    wallet,
    {
      preflightCommitment: "processed",
    }
  );

  return provider;
};

export const getProgram = () => {
  const provider = getProvider();
  const programID = new PublicKey("DJP29BHSSNf2peZoXqzXZpVWZSZZVrK6xrDS3NEoMK1R");
  return new Program(idl, programID, provider);
};

