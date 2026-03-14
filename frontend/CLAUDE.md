# SkyChain - Decentralized No-Fly Zone Registry on Solana

## Project Context

This is a hackathon project (AeroHacks, McGill, ~12h timeframe, 2-person team). The goal is to win the **Solana sponsor prize**. The MLH judge evaluates the code directly, so the Solana integration must be functional, not cosmetic.

**Concept**: A decentralized registry of no-fly zones stored on the Solana blockchain. Authorities (governments) write zones on-chain. Drone operators read zones permissionlessly (no wallet, no cost) and check if a coordinate falls inside a restricted polygon.

**Team split**: One teammate handles the Rust/Anchor on-chain program. This codebase is the TypeScript client + React frontend.

## Architecture

```
[Solana Devnet] <-- RPC calls --> [TypeScript Client Library] <-- used by --> [React Frontend (Vite)]
```

- No backend server. The frontend talks directly to Solana devnet via RPC.
- The Anchor program is deployed at: `Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd`
- Reads are free RPC calls (no wallet, no transaction).
- Writes (creating zones) require a wallet signature from an authorized authority.

## On-Chain Program (Rust/Anchor) - NOT in this repo

The teammate's Anchor program defines:

### Account Structs

**Authority** (PDA seeds: `["authority"]`)
```
{
  authority: Pubkey   // the wallet authorized to create/delete zones
}
```

**NoFlyZone** (PDA seeds: UNKNOWN - must ask teammate)
```
{
  zone_id: u64,           // numeric group ID (e.g., all Montreal zones = 1)
  polygon_id: String,     // unique identifier per polygon (e.g., "mtl-airport")
  owner: Pubkey,          // who created this zone
  polygon: Vec<ZonePoints> // array of {lat: f64, lng: f64}
}
```

**ZonePoints**
```
{
  lat: f64,
  lng: f64
}
```

### Instructions

1. **set_authority(new_authority: Pubkey)** - Sets or transfers the authority role. Only the current authority (or initial deployer) can call this.

2. **create_no_fly_zone(polygon_id: String, zone_id: u64, polygon: Vec<ZonePoints>)** - Creates a new no-fly zone account on-chain. Requires authority signature. Accounts needed: `no_fly_zone` (the new account), `authority_config` (PDA at seeds=["authority"]), `authority` (signer, must match authority_config.authority), `system_program`.

3. **delete_no_fly_zone(_polygon_id: String)** - Deletes (closes) a zone account. Requires the zone's owner to sign.

### Custom Errors
- `Unauthorized` (6000): Signer is not the authority
- `InstructionMissing` (6001): Invalid authority for the operation

## CRITICAL OPEN ISSUE: NoFlyZone PDA Seeds

The IDL at `idl/sky_chain.json` does NOT specify PDA seeds for the `no_fly_zone` account (unlike `authority_config` which has `seeds: ["authority"]`). This means either:

1. The zone account is NOT a PDA -- it's a regular keypair account. Client must generate a fresh `Keypair`, pass its pubkey, and include it as an additional signer.
2. The PDA derivation is done manually inside the instruction handler and Anchor didn't surface it.

**This must be clarified with the teammate before write operations can work.** Read operations (`.all()`) work regardless.

If it's a Keypair approach:
```typescript
const zoneKeypair = Keypair.generate();
// pass zoneKeypair.publicKey as noFlyZone account
// include zoneKeypair in signers array
```

If it's a PDA approach (seeds TBD):
```typescript
const [zonePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("SEEDS_HERE"), Buffer.from(polygonId)],
  programId
);
// pass zonePda as noFlyZone account, no extra signer needed
```

## This Codebase Structure

```
src/
  lib/
    types.ts      -- TypeScript interfaces mirroring on-chain structs
    geometry.ts   -- Ray casting point-in-polygon algorithm
    mockData.ts   -- Fake Montreal zones for UI dev (delete when real data flows)
    program.ts    -- Solana connection, read/write functions (USE_MOCKS flag)
  App.tsx         -- React app: Leaflet map, zone rendering, click-to-check
  main.tsx        -- Vite entry point
  index.css       -- Minimal reset CSS
idl/
  sky_chain.json  -- The Anchor IDL (auto-generated from Rust program)
```

## Current State

- [x] Vite + React + TypeScript scaffolded
- [x] Dependencies installed (@coral-xyz/anchor, @solana/web3.js, react-leaflet, leaflet)
- [x] Mock data renders on Leaflet map with click-to-check functionality
- [x] Point-in-polygon (ray casting) algorithm implemented
- [x] IDL received and analyzed
- [ ] Real Solana read calls (flip USE_MOCKS, uncomment real implementation)
- [ ] Real Solana write calls (blocked on PDA seeds question)
- [ ] Admin UI for drawing polygons and submitting zones
- [ ] Pitch deck (8-10 slides)

## Key Technical Details

### Anchor TypeScript Client Pattern

```typescript
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import idl from "../idl/sky_chain.json";

const PROGRAM_ID = new PublicKey("Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// For reads (no wallet):
const program = new Program(idl, PROGRAM_ID, { connection });
const allZones = await program.account.noFlyZone.all();

// zone_id is u64, Anchor deserializes it as BN (big number)
// Call .toNumber() to get a JS number
```

### Authority PDA Derivation

```typescript
const [authorityPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("authority")],
  PROGRAM_ID
);
```

### Reading All Zones

```typescript
const accounts = await program.account.noFlyZone.all();
// Returns: [{ publicKey: PublicKey, account: { zoneId: BN, polygonId: string, owner: PublicKey, polygon: [{lat, lng}, ...] } }]
```

### Point-in-Polygon

Ray casting algorithm in `src/lib/geometry.ts`. Takes a {lat, lng} point and array of {lat, lng} vertices. Returns boolean. Works with any number of vertices.

## Style & Constraints

- No unnecessary abstraction. Ship fast.
- Admin mode: toggle on the same page (not a separate route) for simplicity.
- In admin mode, clicks add vertices to a polygon. Submit button sends createNoFlyZone transaction.
- The "drones report their position" feature is CUT. Do not build it.
- Polygon precision: up to 10 vertices per zone.
- All operations are on Solana devnet.
- The map defaults to Montreal center (45.5017, -73.5673).

## Dependencies

```json
{
  "@coral-xyz/anchor": "^0.32.1",
  "@solana/web3.js": "^1.98.4",
  "react-leaflet": "latest",
  "leaflet": "latest"
}
```

## What Needs To Happen Next

1. Clarify NoFlyZone PDA seeds with teammate
2. Swap USE_MOCKS to false in program.ts, implement real Solana calls
3. Build admin mode UI (draw polygon on map, submit to chain)
4. Test full flow: set authority -> create zone -> read zone -> display on map
5. Pitch deck (8-10 slides, last priority)
