/** Security checks shared by unauthenticated mutation routes. */
export function isTrustedMutationRequest(req: Request): boolean {
  // Browsers attach this header to cross-site requests. Rejecting it prevents a
  // third-party page from silently using a visitor's browser to submit data.
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = req.headers.get("origin");
  // Non-browser clients and Vercel Cron do not necessarily send Origin. Their
  // abuse protection is handled by the route-specific server-side rate limits.
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return Boolean(host) && originUrl.host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-forwarded-for");
  return (forwardedFor ?? req.headers.get("x-real-ip") ?? "0.0.0.0").split(",")[0].trim();
}
