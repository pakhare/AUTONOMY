// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { Newdapp } from "../target/types/newdapp";

// describe("newdapp", () => {
//   // Configure the client to use the local cluster.
//   anchor.setProvider(anchor.AnchorProvider.env());

//   const program = anchor.workspace.newdapp as Program<Newdapp>;

//   it("Is initialized!", async () => {
//     // Add your test here.
//     const tx = await program.methods.initialize().rpc();
//     console.log("Your transaction signature", tx);
//   });
// });



import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Newdapp } from "../target/types/newdapp";

describe("newdapp", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  console.log("Available programs in workspace:", Object.keys(anchor.workspace)); // 🔍 debug

  const program = anchor.workspace["newdapp"] as Program<Newdapp>; // bracket notation just in case

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
