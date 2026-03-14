import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import type { NoFlyZone, ZonePoint } from "./types";
import { MOCK_ZONES } from "./mockData";

// ============================================================
// CONFIG
// ============================================================

const PROGRAM_ID = new PublicKey("Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd");
const RPC_URL = "https://api.devnet.solana.com";
const USE_MOCKS = true; // flip to false when program is deployed

// ============================================================
// CONNECTION
// ============================================================

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Initialize the Anchor program.
 * Uncomment when IDL is plugged in and USE_MOCKS is false.
 */
// import { AnchorProvider, Program, Idl, BN } from "@coral-xyz/anchor";
// import idl from "../../idl/sky_chain.json";
//
// function getProgram(wallet?: Keypair) {
//   const provider = wallet
//     ? new AnchorProvider(connection, {
//         publicKey: wallet.publicKey,
//         signTransaction: async (tx) => { tx.sign(wallet); return tx; },
//         signAllTransactions: async (txs) => { txs.forEach(tx => tx.sign(wallet)); return txs; },
//       }, { commitment: "confirmed" })
//     : { connection };
//   return new Program(idl as Idl, PROGRAM_ID, provider);
// }

// ============================================================
// DERIVED ADDRESSES
// ============================================================

/** Authority config PDA - seeds are ["authority"] per the IDL */
export function deriveAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Zone PDA - seeds are UNKNOWN, must confirm with teammate.
 * Placeholder using ["no_fly_zone", polygonId].
 * UPDATE THIS once teammate confirms the seeds.
 */
export function deriveZonePda(polygonId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("no_fly_zone"), Buffer.from(polygonId)],
    PROGRAM_ID
  );
  return pda;
}

// ============================================================
// READ OPERATIONS (no wallet needed)
// ============================================================

export async function getAllZones(): Promise<NoFlyZone[]> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_ZONES;
  }

  // REAL IMPLEMENTATION:
  // const program = getProgram();
  // const accounts = await program.account.noFlyZone.all();
  // return accounts.map((acc) => ({
  //   zoneId: (acc.account.zoneId as BN).toNumber(),
  //   polygonId: acc.account.polygonId as string,
  //   owner: (acc.account.owner as PublicKey).toString(),
  //   polygon: acc.account.polygon as ZonePoint[],
  // }));

  return [];
}

export async function getZone(polygonId: string): Promise<NoFlyZone | null> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_ZONES.find((z) => z.polygonId === polygonId) ?? null;
  }

  // REAL IMPLEMENTATION (requires correct PDA seeds):
  // const program = getProgram();
  // const pda = deriveZonePda(polygonId);
  // try {
  //   const acc = await program.account.noFlyZone.fetch(pda);
  //   return {
  //     zoneId: (acc.zoneId as BN).toNumber(),
  //     polygonId: acc.polygonId as string,
  //     owner: (acc.owner as PublicKey).toString(),
  //     polygon: acc.polygon as ZonePoint[],
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
 * BLOCKED: Need to confirm whether no_fly_zone account is a PDA or Keypair.
 */
export async function createZone(
  _wallet: Keypair,
  _polygonId: string,
  _zoneId: number,
  _polygon: ZonePoint[],
): Promise<string> {
  if (USE_MOCKS) {
    console.log("[MOCK] Would create zone:", _polygonId);
    return "MOCK_TX_SIGNATURE";
  }

  // REAL IMPLEMENTATION (PDA approach - if teammate confirms seeds):
  // const program = getProgram(wallet);
  // const zonePda = deriveZonePda(polygonId);
  // const authorityPda = deriveAuthorityPda();
  // const tx = await program.methods
  //   .createNoFlyZone(polygonId, new BN(zoneId), polygon)
  //   .accounts({
  //     noFlyZone: zonePda,
  //     authorityConfig: authorityPda,
  //     authority: wallet.publicKey,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .signers([wallet])
  //   .rpc();
  // return tx;

  // ALTERNATIVE (Keypair approach - if no_fly_zone is NOT a PDA):
  // const program = getProgram(wallet);
  // const zoneKeypair = Keypair.generate();
  // const authorityPda = deriveAuthorityPda();
  // const tx = await program.methods
  //   .createNoFlyZone(polygonId, new BN(zoneId), polygon)
  //   .accounts({
  //     noFlyZone: zoneKeypair.publicKey,
  //     authorityConfig: authorityPda,
  //     authority: wallet.publicKey,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .signers([wallet, zoneKeypair])
  //   .rpc();
  // return tx;

  return "";
}

export { connection, PROGRAM_ID };
