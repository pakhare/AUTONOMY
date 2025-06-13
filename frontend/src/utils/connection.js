import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program } from '@project-serum/anchor';
import idl from '../idl/newdapp.json';

const getProvider = () => {
  // const network = process.env.REACT_APP_SOLANA_NETWORK; // e.g. "devnet" or "localhost"
  // const connection = network === "localhost"
  //   ? new Connection("http://localhost:8899")
  //   : new Connection(clusterApiUrl(network));

  const connection = new Connection("http://localhost:8899");
  

  const provider = new AnchorProvider(
    connection,
    window.solana, // Phantom wallet injected
    {
      preflightCommitment: "processed",
    }
  );
  return provider;
};

export const getProgram = () => {
  const provider = getProvider();
  const programID = new PublicKey("J47PG3y5XHQm36EhDZpMY7rpkSfJMBEYxYKkk5T8CqfL"); // your program ID
  return new Program(idl, programID, provider);
};
