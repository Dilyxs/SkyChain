import type { NoFlyZone } from "./types";

/**
 * Mock zones for UI development.
 * These are real no-fly zones in Montreal for demo purposes.
 * Replace with on-chain data once IDL is plugged in.
 */
export const MOCK_ZONES: NoFlyZone[] = [
  {
    authority: "MOCK_AUTHORITY",
    zoneId: "mtl-airport",
    name: "Montreal-Trudeau Airport",
    active: true,
    vertices: [
      [45.4577, -73.7508],
      [45.4577, -73.7308],
      [45.4777, -73.7308],
      [45.4777, -73.7508],
    ],
  },
  {
    authority: "MOCK_AUTHORITY",
    zoneId: "mtl-downtown",
    name: "Downtown Montreal Restricted",
    active: true,
    vertices: [
      [45.4950, -73.5800],
      [45.4950, -73.5550],
      [45.5100, -73.5550],
      [45.5100, -73.5800],
    ],
  },
  {
    authority: "MOCK_AUTHORITY",
    zoneId: "mtl-olympic",
    name: "Olympic Stadium Area",
    active: true,
    vertices: [
      [45.5550, -73.5580],
      [45.5550, -73.5480],
      [45.5620, -73.5480],
      [45.5620, -73.5580],
    ],
  },
];
