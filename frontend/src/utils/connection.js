import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@project-serum/anchor';
import idl from '../idl/newdapp.json';

const getProvider = () => {
  const connection = new Connection("https://api.devnet.solana.com", "processed");

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
  const programID = new PublicKey("HbgZigj7TcGwVHs3Z8A5soSmaWEsAAdNsVXaGi5SiDV1"); // Replace with your devnet program ID
  return new Program(idl, programID, provider);
};
