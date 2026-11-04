/** Explicit proxy configuration; direct deployments trust no forwarding headers. */
export function parseTrustProxy(value = ''): false | number | string[] {
  const normalized = value.trim();
  if (!normalized || normalized === 'false' || normalized === '0') return false;
  if (/^\d+$/.test(normalized)) {
    const hops = Number(normalized);
    if (!Number.isSafeInteger(hops)) throw new Error('TRUST_PROXY hop count is invalid.');
    return hops;
  }
  if (normalized === 'true') throw new Error('TRUST_PROXY must specify proxy hops or trusted addresses, not true.');
  return normalized.split(',').map(value => value.trim()).filter(Boolean);
}
