import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import type { NoFlyZone, ZonePoint } from "./types";
import { MOCK_ZONES } from "./mockData";
import idl from "../../idl/sky_chain.json";

// ============================================================
// CONFIG
// ============================================================

const PROGRAM_ID = new PublicKey(
  "Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd",
);
const RPC_URL = "https://api.devnet.solana.com";
const USE_MOCKS = false;

// ============================================================
// CONNECTION
// ============================================================

export const connection = new Connection(RPC_URL, "confirmed");

// Read-only program (no wallet)
function getReadProgram() {
  return new Program(idl as Idl, { connection }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Write program (provider carries the wallet — keypair or browser wallet)
function getWriteProgram(provider: AnchorProvider) {
  return new Program(idl as Idl, provider) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
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

  const program = getReadProgram();
  const accounts = await program.account.noFlyZone.all();
  return accounts.map((acc: any) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
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

  const program = getReadProgram();
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

/** Returns true if the authority_config PDA has already been initialized. */
export async function isAuthorityInitialized(): Promise<boolean> {
  const info = await connection.getAccountInfo(deriveAuthorityPda());
  return info !== null;
}

// ============================================================
// WRITE OPERATIONS (AnchorProvider required)
// Both keypair-based and browser-wallet-based providers work here.
// ============================================================

/** One-time setup: initializes the authority_config PDA. */
export async function initAuthority(provider: AnchorProvider): Promise<string> {
  const program = getWriteProgram(provider);
  return program.methods
    .setAuthority(provider.publicKey)
    .accounts({
      authority: deriveAuthorityPda(),
      owner: provider.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Create a new no-fly zone on-chain. PDA seeds: ["no_fly_zone", polygonId] */
export async function createZone(
  provider: AnchorProvider,
  polygonId: string,
  zoneId: number,
  polygon: ZonePoint[],
): Promise<string> {
  if (USE_MOCKS) {
    console.log("[MOCK] Would create zone:", polygonId);
    return "MOCK_TX_SIGNATURE";
  }

  const program = getWriteProgram(provider);
  return program.methods
    .createNoFlyZone(polygonId, new BN(zoneId), polygon)
    .accounts({
      noFlyZone: deriveZonePda(polygonId),
      authorityConfig: deriveAuthorityPda(),
      authority: provider.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Delete a no-fly zone. The provider's wallet must be the zone's owner. */
export async function deleteZone(
  provider: AnchorProvider,
  polygonId: string,
): Promise<string> {
  if (USE_MOCKS) {
    console.log("[MOCK] Would delete zone:", polygonId);
    return "MOCK_TX_SIGNATURE";
  }

  const program = getWriteProgram(provider);
  return program.methods
    .deleteNoFlyZone(polygonId)
    .accounts({
      noFlyZone: deriveZonePda(polygonId),
      owner: provider.publicKey,
    })
    .rpc();
}
export async function createDroneLog(
  provider: AnchorProvider,
  drone_serial: string,
  time_unix: number,
  lat: number,
  long: number,
) {
  const program = getWriteProgram(provider);

  const timeUnixBN = new BN(time_unix);

  const [droneLogPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("drone_log"),
      Buffer.from(drone_serial),
      provider.wallet.publicKey.toBuffer(),
      timeUnixBN.toArrayLike(Buffer, "be", 8),
    ],
    program.programId,
  );

  return program.methods
    .createDroneLog(drone_serial, timeUnixBN, lat, long)
    .accounts({
      droneLog: droneLogPda,
      owner: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
export { PROGRAM_ID };
