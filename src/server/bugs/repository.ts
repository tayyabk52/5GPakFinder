import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BugReportInput } from "@/features/bug-reports/schema";

export const bugRepository = {
  async checkGate(ipHash: string, fingerprint: string) {
    const { data, error } = await createSupabaseServerClient().rpc("check_bug_submission", { p_ip_hash: ipHash, p_fingerprint: fingerprint });
    if (error) throw error;
    return data as "allowed" | "rate_limited" | "blocked";
  },
  async insert(input: BugReportInput, ipHash: string, userAgent: string | null) {
    const { error } = await createSupabaseServerClient().from("bug_reports").insert({
      category: input.category, impact: input.impact, title: input.title, steps_to_reproduce: input.stepsToReproduce,
      expected_behavior: input.expectedBehavior, actual_behavior: input.actualBehavior, page_path: input.pagePath,
      device_fingerprint: input.deviceFingerprint, ip_hash: ipHash, user_agent: userAgent,
    });
    if (error) throw error;
  },
};
