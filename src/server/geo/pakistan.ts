// Vercel sets this from the connecting IP at the edge. It is not trusted when
// absent (local development and some proxies do not provide it), but when it is
// present it stops a foreign request from submitting a forged Pakistan pin.
export function isKnownForeignRequest(request: Request): boolean {
  const country = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  return Boolean(country && country !== "PK");
}
