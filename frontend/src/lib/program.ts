import { Connection, PublicKey, Keypair, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import type { NoFlyZone, ZonePoint } from "./types";
import { MOCK_ZONES } from "./mockData";
import idl from "../../idl/sky_chain.json";

// ============================================================
// CONFIG
// ============================================================

const PROGRAM_ID = new PublicKey("Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd");
const RPC_URL = "https://api.devnet.solana.com";
const USE_MOCKS = false;

// ============================================================
// CONNECTION
// ============================================================

const connection = new Connection(RPC_URL, "confirmed");

function getProgram(wallet?: Keypair) {
  if (wallet) {
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (tx instanceof Transaction) tx.sign(wallet);
        return tx;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        txs.forEach((tx) => { if (tx instanceof Transaction) tx.sign(wallet); });
        return txs;
      },
    };
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
    return new Program(idl as Idl, provider);
  }
  return new Program(idl as Idl, { connection });
}

// ============================================================
// DERIVED ADDRESSES
// ============================================================

const enc = new TextEncoder();

/** Authority config PDA — seeds: ["authority"] */
export function deriveAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [enc.encode("authority")],
    PROGRAM_ID,
  );
  return pda;
}

/** Zone PDA — seeds: ["no_fly_zone", polygonId] (confirmed from lib.rs:79) */
export function deriveZonePda(polygonId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [enc.encode("no_fly_zone"), enc.encode(polygonId)],
    PROGRAM_ID,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = getProgram() as any;
  const accounts = await program.account.noFlyZone.all();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return accounts.map((acc: any) => {
    const data = acc.account as {
      zoneId: BN;
      polygonId: string;
      owner: PublicKey;
      polygon: ZonePoint[];
    };
    return {
      zoneId: data.zoneId.toNumber(),
      polygonId: data.polygonId,
      owner: data.owner.toString(),
      polygon: data.polygon,
    };
  });
}

export async function getZone(polygonId: string): Promise<NoFlyZone | null> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_ZONES.find((z) => z.polygonId === polygonId) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = getProgram() as any;
  const pda = deriveZonePda(polygonId);
  try {
    const acc = await program.account.noFlyZone.fetch(pda);
    const data = acc as {
      zoneId: BN;
      polygonId: string;
      owner: PublicKey;
      polygon: ZonePoint[];
    };
    return {
      zoneId: data.zoneId.toNumber(),
      polygonId: data.polygonId,
      owner: data.owner.toString(),
      polygon: data.polygon,
    };
  } catch {
    return null;
  }
}

// ============================================================
// WRITE OPERATIONS (wallet required)
// ============================================================

/** Returns true if the authority_config PDA has already been initialized. */
export async function isAuthorityInitialized(): Promise<boolean> {
  const pda = deriveAuthorityPda();
  const info = await connection.getAccountInfo(pda);
  return info !== null;
}

/**
 * One-time setup: initializes the authority_config PDA.
 * Must be called before any createZone calls.
 */
export async function initAuthority(wallet: Keypair): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = getProgram(wallet) as any;
  const authorityPda = deriveAuthorityPda();
  const tx = await program.methods
    .setAuthority(wallet.publicKey)
    .accounts({
      authority: authorityPda,
      owner: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();
  return tx;
}

/**
 * Create a new no-fly zone on-chain.
 * PDA seeds confirmed: ["no_fly_zone", polygonId] (lib.rs:79)
 */
export async function createZone(
  wallet: Keypair,
  polygonId: string,
  zoneId: number,
  polygon: ZonePoint[],
): Promise<string> {
  if (USE_MOCKS) {
    console.log("[MOCK] Would create zone:", polygonId);
    return "MOCK_TX_SIGNATURE";
  }

  const program = getProgram(wallet);
  const zonePda = deriveZonePda(polygonId);
  const authorityPda = deriveAuthorityPda();

  const tx = await program.methods
    .createNoFlyZone(polygonId, new BN(zoneId), polygon)
    .accounts({
      noFlyZone: zonePda,
      authorityConfig: authorityPda,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

export { connection, PROGRAM_ID };
