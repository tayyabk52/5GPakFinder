import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SuggestionInput } from "@/features/suggestions/schema";

export const suggestionRepository = {
  async checkGate(ipHash: string, fingerprint: string) {
    const { data, error } = await createSupabaseServerClient().rpc("check_suggestion_submission", {
      p_ip_hash: ipHash, p_fingerprint: fingerprint,
    });
    if (error) throw error;
    return data as "allowed" | "rate_limited" | "blocked";
  },
  async insert(input: SuggestionInput, ipHash: string) {
    const { error } = await createSupabaseServerClient().from("feature_suggestions").insert({
      category: input.category, audience: input.audience, title: input.title,
      problem: input.problem, proposal: input.proposal, page_path: input.pagePath,
      device_fingerprint: input.deviceFingerprint, ip_hash: ipHash,
    });
    if (error) throw error;
  },
};
