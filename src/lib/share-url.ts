/** Stable asset URL. A replaced share adds `?v=` so cached copies are skipped. */
export function shareAssetURL(
  origin: string,
  path: string,
  revision?: number | null,
): string {
  const url = new URL(path, origin)
  if (revision && revision > 0) url.searchParams.set("v", String(revision))
  return url.href
}
