import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashIp } from "@/server/reports/ipHash";
import { clientIp } from "@/server/security/request";

export type SpeedtestRequestKind = "download" | "upload" | "resolve";

export async function consumeSpeedtestBudget(req: Request, kind: SpeedtestRequestKind): Promise<"allowed" | "rate_limited" | "unavailable"> {
  // Unit tests exercise route contracts without a Supabase connection. This is
  // never active in a production deployment.
  if (process.env.NODE_ENV === "test") return "allowed";
  const salt = process.env.SUPABASE_IP_HASH_SALT;
  if (!salt) return "unavailable";

  const { data, error } = await createSupabaseServerClient().rpc("check_speedtest_request", {
    p_ip_hash: hashIp(clientIp(req), salt),
    p_kind: kind,
  });
  if (error || (data !== "allowed" && data !== "rate_limited")) return "unavailable";
  return data;
}
