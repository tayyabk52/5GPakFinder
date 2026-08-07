import { createHash } from "crypto";

export function hashIp(ipAddress: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ipAddress}`).digest("hex");
}
