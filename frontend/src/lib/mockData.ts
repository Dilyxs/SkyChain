import type { NoFlyZone } from "./types";

export const MOCK_ZONES: NoFlyZone[] = [
  {
    owner: "MOCK_AUTHORITY",
    zoneId: 1,
    polygonId: "mtl-airport",
    polygon: [
      { lat: 45.4577, lng: -73.7508 },
      { lat: 45.4577, lng: -73.7308 },
      { lat: 45.4777, lng: -73.7308 },
      { lat: 45.4777, lng: -73.7508 },
    ],
  },
  {
    owner: "MOCK_AUTHORITY",
    zoneId: 1,
    polygonId: "mtl-downtown",
    polygon: [
      { lat: 45.4950, lng: -73.5800 },
      { lat: 45.4950, lng: -73.5550 },
      { lat: 45.5100, lng: -73.5550 },
      { lat: 45.5100, lng: -73.5800 },
    ],
  },
  {
    owner: "MOCK_AUTHORITY",
    zoneId: 2,
    polygonId: "mtl-olympic",
    polygon: [
      { lat: 45.5550, lng: -73.5580 },
      { lat: 45.5550, lng: -73.5480 },
      { lat: 45.5620, lng: -73.5480 },
      { lat: 45.5620, lng: -73.5580 },
    ],
  },
];
