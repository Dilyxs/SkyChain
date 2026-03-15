export interface DroneLog {
  droneSerial: string;
  timeUnix: number;
  lat: number;
  long: number;
}

export interface ZonePoint {
  lat: number;
  lng: number;
}

export interface NoFlyZone {
  /** u64 group ID (e.g., all Montreal zones = 1) */
  zoneId: number;
  /** Unique identifier per polygon, used as PDA seed */
  polygonId: string;
  /** Pubkey of who created this zone */
  owner: string;
  /** Array of {lat, lng} forming the polygon boundary */
  polygon: ZonePoint[];
}
