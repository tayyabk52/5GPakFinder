import ngeohash from "ngeohash";

export function encodeGeohash(lat: number, lon: number, precision = 7): string {
  return ngeohash.encode(lat, lon, precision);
}

export function geohashCenter(hash: string): { lat: number; lon: number } {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lon: longitude };
}

export function geohashBbox(hash: string): {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
} {
  const [minLat, minLon, maxLat, maxLon] = ngeohash.decode_bbox(hash);
  return { minLat, minLon, maxLat, maxLon };
}

export function precisionForZoom(zoom: number): number {
  if (zoom < 6) return 4;
  if (zoom < 9) return 5;
  if (zoom < 11) return 6;
  return 7;
}
