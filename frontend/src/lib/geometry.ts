import type { Coord } from "./types";

/**
 * Ray casting algorithm.
 * Casts a horizontal ray from the point to the right.
 * Counts how many polygon edges the ray crosses.
 * Odd crossings = inside. Even = outside.
 *
 * @param point - [lat, lng] to test
 * @param polygon - array of [lat, lng] vertices forming a closed polygon
 * @returns true if the point is inside the polygon
 */
export function isPointInPolygon(point: Coord, polygon: Coord[]): boolean {
  const [px, py] = point;
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [ix, iy] = polygon[i];
    const [jx, jy] = polygon[j];

    // Check if the ray crosses this edge
    const intersects =
      iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point is inside ANY of the provided polygons.
 *
 * @param point - [lat, lng] to test
 * @param zones - array of polygons (each polygon is an array of [lat, lng])
 * @returns the first zone that contains the point, or null
 */
export function findContainingZone(
  point: Coord,
  zones: { zoneId: string; name: string; vertices: Coord[] }[]
): { zoneId: string; name: string } | null {
  for (const zone of zones) {
    if (isPointInPolygon(point, zone.vertices)) {
      return { zoneId: zone.zoneId, name: zone.name };
    }
  }
  return null;
}
