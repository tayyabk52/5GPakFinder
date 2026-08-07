const ngeohash = require("ngeohash");
const fs = require("fs");

const JAZZ = "Jazz";
const ZONG = "Zong";
const UFONE = "Ufone";

function generatePoints(centerLat, centerLng, op, count, speedMin, speedMax) {
  const pts = [];
  for(let i = 0; i < count; i++) {
    // jitter within ~0.005 degrees
    const lat = centerLat + (Math.random() * 0.01 - 0.005);
    const lng = centerLng + (Math.random() * 0.01 - 0.005);
    const hash = ngeohash.encode(lat, lng, 9);
    const speed = (Math.random() * (speedMax - speedMin) + speedMin).toFixed(2);
    
    pts.push(`(
      ${lat}, ${lng}, '${hash}', 10, false, '${op}', 'mobile', ${speed}, 25.0, 15, 
      'dummy-fingerprint-${Math.random()}', 'dummy-ip-${Math.random()}', 0.95, 'visible'
    )`);
  }
  return pts;
}

const inserts = [
  ...generatePoints(31.565, 74.320, ZONG, 5, 150, 250), // Ultra fast Zong
  ...generatePoints(31.565, 74.320, JAZZ, 4, 40, 80),    // Mediocre Jazz
  ...generatePoints(31.565, 74.320, UFONE, 3, 220, 300), // Blazing Ufone
  
  ...generatePoints(31.560, 74.315, JAZZ, 6, 120, 180),  // Good Jazz
  ...generatePoints(31.560, 74.315, ZONG, 2, 20, 50),    // Poor Zong
];

const sql = `
-- 1. CLEANUP OLD SCHEMA IF IT HAD PRESENCE Enum values
-- (This ensures the new schema cleanly applies)
TRUNCATE TABLE public.reports;
TRUNCATE TABLE public.report_submissions_log;

-- 2. APPLY NEW SCHEMA (from schema.md)
-- ... I will just tell the user to run schema.md first, then run this.

-- 3. INSERT DUMMY DATA FOR LAHORE
INSERT INTO public.reports (
  latitude, longitude, geohash, accuracy_meters, is_manual_pin, 
  operator, speed_source, download_mbps, upload_mbps, ping_ms, 
  device_fingerprint, ip_hash, trust_score, status
)
VALUES
${inserts.join(",\n")};
`;

fs.writeFileSync("dummy_lahore.sql", sql);
console.log("Written dummy_lahore.sql");
