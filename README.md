# SkyChain - Decentralized No-Fly Zone Registry on Solana

SkyChain is a Solana smart contract (program) built with Anchor that manages no-fly zones on-chain. Authorities can register restricted airspace polygons, drone operators can query them, and drone flight logs are recorded immutably.

**Program ID:** `Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd`

---

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.32.1)
- [Node.js](https://nodejs.org/) + Yarn

---

## Setup & Deployment

### 1. Configure Solana CLI

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Generate a keypair (if you don't have one)
solana-keygen new -o ~/.config/solana/id.json

# Airdrop SOL for deployment fees
solana airdrop 2
```

### 2. Build the Program

```bash
cd anchor_program
anchor build
```

This compiles the Rust program and generates:
- `target/deploy/sky_chain.so` — the compiled BPF program
- `target/idl/sky_chain.json` — the IDL (Interface Definition Language) used by clients
- `target/types/sky_chain.ts` — TypeScript types

### 3. Check Your Program ID

After building, verify the program keypair matches the declared ID:

```bash
solana-keygen pubkey target/deploy/sky_chain-keypair.json
```

If it doesn't match the `declare_id!()` in `lib.rs`, update `lib.rs` and `Anchor.toml` with the new key, then rebuild.

### 4. Deploy

```bash
anchor deploy
```

You'll see output like:
```
Deploying program "sky_chain"...
Program Id: Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd
Deployment successful.
```

### 5. Verify On-Chain

```bash
solana program show Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd
```

---

## Program Architecture (Rust / Anchor)

The program lives in `anchor_program/programs/sky-chain/src/lib.rs` and exposes **4 instructions**.

### Account Layout

```
┌──────────────────────────────────────────────────────┐
│  Authority (PDA)                                     │
│  Seeds: ["authority"]                                │
│  ├── authority: Pubkey (the authorized signer)       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  NoFlyZone (PDA)                                     │
│  Seeds: ["no_fly_zone", polygon_id.as_bytes()]       │
│  ├── zone_id: u64           (group identifier)       │
│  ├── polygon_id: String     (unique zone name)       │
│  ├── owner: Pubkey          (creator's pubkey)       │
│  └── polygon: Vec<ZonePoints>  (up to 10 vertices)   │
│       ├── lat: f64                                   │
│       └── lng: f64                                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  DroneLogs (PDA)                                     │
│  Seeds: ["drone_log", serial, owner, timestamp]      │
│  ├── drone_serial: String   (max 40 chars)           │
│  ├── time_unix: u64         (UNIX timestamp)         │
│  ├── lat: f64                                        │
│  └── long: f64                                       │
└──────────────────────────────────────────────────────┘
```

### Instructions

#### 1. `set_authority(new_authority: Pubkey)`

Initializes the authority PDA. This is a one-time setup that determines who can create no-fly zones.

```rust
#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(init, payer = owner, space = ANCHOR_DISCRIMINATOR_SIZE + Authority::INIT_SPACE, seeds = [b"authority"], bump)]
    pub authority: Account<'info, Authority>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

The authority is validated against a hardcoded public key to ensure only the designated admin can initialize.

#### 2. `create_no_fly_zone(polygon_id: String, zone_id: u64, polygon: Vec<ZonePoints>)`

Creates a restricted airspace zone stored as a polygon on-chain. Only the authority can call this.

```rust
#[derive(Accounts)]
#[instruction(polygon_id: String)]
pub struct CreateNoFlyZone<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + NoFlyZone::INIT_SPACE,
        seeds = [b"no_fly_zone", polygon_id.as_bytes()],
        bump
    )]
    pub no_fly_zone: Account<'info, NoFlyZone>,

    #[account(seeds = [b"authority"], bump)]
    pub authority_config: Account<'info, Authority>,

    #[account(mut, constraint = authority.key() == authority_config.authority @ SkyChainErrorCode::Unauthorized)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

Key points:
- **PDA-derived**: each zone is a PDA seeded by `["no_fly_zone", polygon_id]`, making it deterministically addressable
- **Authority check**: the signer must match the stored authority pubkey
- **`init_if_needed`**: allows updating an existing zone with the same polygon_id

#### 3. `delete_no_fly_zone(_polygon_id: String)`

Closes a zone account and reclaims the rent SOL. Only the zone owner can delete it.

```rust
#[derive(Accounts)]
#[instruction(_polygon_id: String)]
pub struct DeleteNoFlyZone<'info> {
    #[account(
        mut,
        seeds = [b"no_fly_zone", _polygon_id.as_bytes()],
        bump,
        close = owner
    )]
    pub no_fly_zone: Account<'info, NoFlyZone>,

    #[account(mut, constraint = owner.key() == no_fly_zone.owner @ SkyChainErrorCode::Unauthorized)]
    pub owner: Signer<'info>,
}
```

The `close = owner` directive sends the lamports back to the owner when the account is closed.

#### 4. `create_drone_log(drone_serial: String, time_unix: u64, lat: f64, long: f64)`

Logs a drone's position at a specific timestamp. Each log is a unique PDA.

```rust
#[derive(Accounts)]
#[instruction(drone_serial: String, time_unix: u64)]
pub struct CreateDroneLog<'info> {
    #[account(
        init,
        payer = owner,
        space = ANCHOR_DISCRIMINATOR_SIZE + DroneLogs::INIT_SPACE,
        seeds = [b"drone_log", drone_serial.as_bytes(), owner.key().as_ref(), &time_unix.to_be_bytes()],
        bump
    )]
    pub drone_log: Account<'info, DroneLogs>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

The PDA seeds include `drone_serial + owner + timestamp`, meaning each log entry is unique and immutable.

### Error Codes

```rust
#[error_code]
pub enum SkyChainErrorCode {
    #[msg("Unauthorized: Only the authority can perform this action.")]
    Unauthorized,          // 6000

    #[msg("Instruction missing: The new authority must be the predefined authority.")]
    InstructionMissing,    // 6001
}
```

---

## Interacting via Solana CLI

Once deployed, you can inspect accounts directly with the Solana CLI.

### Derive a PDA (for lookup)

You can find a zone's on-chain address by deriving its PDA:

```bash
# Find the Authority PDA
solana find-program-derived-address Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd authority

# Find a specific zone PDA (e.g., polygon_id = "mtl-airport")
solana find-program-derived-address Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd no_fly_zone mtl-airport
```

### Read Account Data

```bash
# Check if the program is deployed
solana program show Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd

# View raw account data for a zone (use the PDA address from above)
solana account <ZONE_PDA_ADDRESS>

# Check your wallet balance
solana balance
```

### Fetch All Program Accounts

```bash
# List all accounts owned by the program
solana program show --programs --program-id Hy29fH4BaM5PtuoVMPfQMwenb3d1ELBbfXq4YzuFxGDd
```

### Run the Tests

```bash
cd anchor_program
anchor test
```

---

## How PDAs Work in This Program

Program Derived Addresses (PDAs) are deterministic account addresses derived from seeds. SkyChain uses them so that any client can compute the address of an account without needing to store it.

```
PDA = findProgramAddress(seeds, programId)
```

| Account     | Seeds                                                    | Purpose                              |
|-------------|----------------------------------------------------------|--------------------------------------|
| Authority   | `["authority"]`                                          | Single global authority config       |
| NoFlyZone   | `["no_fly_zone", polygon_id]`                            | One account per zone, keyed by name  |
| DroneLogs   | `["drone_log", drone_serial, owner_pubkey, timestamp]`   | One account per log entry            |

This means if you know a zone's `polygon_id`, you can compute its on-chain address without any database or indexer.

---

## Project Structure

```
anchor_program/
├── Anchor.toml                    # Anchor config (cluster, program ID, scripts)
├── Cargo.toml                     # Rust workspace
├── programs/
│   └── sky-chain/
│       ├── Cargo.toml             # Program dependencies (anchor-lang 0.32.1)
│       └── src/
│           └── lib.rs             # All program logic (instructions, accounts, errors)
├── tests/
│   └── sky-chain.ts               # Integration tests (TypeScript)
├── target/
│   ├── deploy/                    # Compiled .so and keypair
│   └── idl/sky_chain.json         # Generated IDL for clients
└── migrations/
```

---

## Constraints & Limits

| Field           | Max Size     |
|-----------------|--------------|
| `polygon_id`    | 100 chars    |
| `polygon`       | 10 vertices  |
| `drone_serial`  | 40 chars     |

---

## License

MIT
