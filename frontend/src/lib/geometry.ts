import type { ZonePoint } from "./types";

/**
 * Ray casting algorithm.
 * Casts a horizontal ray from the point to the right.
 * Counts how many polygon edges the ray crosses.
 * Odd crossings = inside. Even = outside.
 */
export function isPointInPolygon(
  point: ZonePoint,
  polygon: ZonePoint[]
): boolean {
  const { lat: px, lng: py } = point;
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const { lat: ix, lng: iy } = polygon[i];
    const { lat: jx, lng: jy } = polygon[j];

    const intersects =
      iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point is inside ANY of the provided zones.
 * Returns the first matching zone, or null.
 */
export function findContainingZone(
  point: ZonePoint,
  zones: { polygonId: string; polygon: ZonePoint[] }[]
): { polygonId: string } | null {
  for (const zone of zones) {
    if (isPointInPolygon(point, zone.polygon)) {
      return { polygonId: zone.polygonId };
    }
  }
  return null;
}
