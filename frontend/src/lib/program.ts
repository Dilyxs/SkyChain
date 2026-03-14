import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import type { NoFlyZone, Coord, ZoneAccount } from "./types";
import { MOCK_ZONES } from "./mockData";

// ============================================================
// CONFIG - Fill these in when your teammate gives them to you
// ============================================================

/** Replace with your teammate's deployed program ID */
const PROGRAM_ID = "REPLACE_WITH_PROGRAM_ID";

/** Devnet RPC endpoint */
const RPC_URL = "https://api.devnet.solana.com";

/** Set to false once IDL is plugged in */
const USE_MOCKS = true;

// ============================================================
// CONNECTION SETUP
// ============================================================

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Initialize the Anchor program.
 * Uncomment and fill in once you have the IDL.
 */
// import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
// import idl from "../../idl/no_fly_zone.json";
//
// function getProgram(wallet?: Keypair) {
//   const provider = new AnchorProvider(
//     connection,
//     wallet ? { publicKey: wallet.publicKey, signTransaction: ..., signAllTransactions: ... } : AnchorProvider.local(),
//     { commitment: "confirmed" }
//   );
//   return new Program(idl as Idl, new PublicKey(PROGRAM_ID), provider);
// }

// ============================================================
// READ OPERATIONS (no wallet needed)
// ============================================================

/**
 * Fetch all no-fly zones from the blockchain.
 * Currently returns mock data. Swap to real fetch when IDL ready.
 */
export async function getAllZones(): Promise<NoFlyZone[]> {
  if (USE_MOCKS) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_ZONES;
  }

  // REAL IMPLEMENTATION (uncomment when IDL is ready):
  // const program = getProgram();
  // const accounts = await program.account.noFlyZone.all();
  // return accounts.map((acc) => ({
  //   authority: acc.account.authority.toString(),
  //   zoneId: acc.account.zoneId,
  //   name: acc.account.name,
  //   vertices: acc.account.vertices as Coord[],
  //   active: acc.account.active,
  // }));

  return [];
}

/**
 * Fetch a single zone by its ID.
 * Derives PDA from seeds and fetches directly.
 */
export async function getZone(zoneId: string): Promise<NoFlyZone | null> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_ZONES.find((z) => z.zoneId === zoneId) ?? null;
  }

  // REAL IMPLEMENTATION:
  // const program = getProgram();
  // const [pda] = PublicKey.findProgramAddressSync(
  //   [Buffer.from("zone"), Buffer.from(zoneId)],
  //   new PublicKey(PROGRAM_ID)
  // );
  // try {
  //   const acc = await program.account.noFlyZone.fetch(pda);
  //   return {
  //     authority: acc.authority.toString(),
  //     zoneId: acc.zoneId,
  //     name: acc.name,
  //     vertices: acc.vertices as Coord[],
  //     active: acc.active,
  //   };
  // } catch {
  //   return null;
  // }

  return null;
}

// ============================================================
// WRITE OPERATIONS (wallet required)
// ============================================================

/**
 * Create a new no-fly zone on-chain.
 * Requires the authority wallet to sign.
 */
export async function createZone(
  _wallet: Keypair,
  _zoneId: string,
  _name: string,
  _vertices: Coord[],
): Promise<string> {
  if (USE_MOCKS) {
    console.log("[MOCK] Would create zone:", _zoneId);
    return "MOCK_TX_SIGNATURE";
  }

  // REAL IMPLEMENTATION:
  // const program = getProgram(wallet);
  // const [zonePda] = PublicKey.findProgramAddressSync(
  //   [Buffer.from("zone"), Buffer.from(zoneId)],
  //   new PublicKey(PROGRAM_ID)
  // );
  // const tx = await program.methods
  //   .createZone(zoneId, name, vertices)
  //   .accounts({
  //     zone: zonePda,
  //     authority: wallet.publicKey,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .signers([wallet])
  //   .rpc();
  // return tx;

  return "";
}

// ============================================================
// UTILITY
// ============================================================

/**
 * Derive PDA for a zone. Useful for direct lookups.
 * Seeds must match your teammate's Rust program.
 */
export function deriveZonePda(zoneId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("zone"), Buffer.from(zoneId)],
    new PublicKey(PROGRAM_ID)
  );
  return pda;
}

export { connection };
