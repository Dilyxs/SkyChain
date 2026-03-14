/**
 * A coordinate pair [latitude, longitude]
 */
export type Coord = [number, number];

/**
 * A no-fly zone as it exists in our application.
 * This mirrors the on-chain NoFlyZone account struct.
 * Adjust field names to match your teammate's Rust struct once the IDL is ready.
 */
export interface NoFlyZone {
  /** The public key of the authority that created this zone */
  authority: string;
  /** Unique zone identifier, used as PDA seed */
  zoneId: string;
  /** Human-readable name */
  name: string;
  /** Array of [lat, lng] pairs forming the polygon boundary */
  vertices: Coord[];
  /** Whether this zone is currently enforced */
  active: boolean;
}

/**
 * On-chain account wrapper (what Anchor returns from .all())
 */
export interface ZoneAccount {
  publicKey: string;
  account: NoFlyZone;
}
