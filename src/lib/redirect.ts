/** Return a canonical same-origin path, including its query and fragment. */
export function safeRedirectPath(raw: string | null): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.includes("\\") ||
    Array.from(raw).some(
      (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
    )
  )
    return "/";
  const base = "https://redirect.invalid";
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return "/";
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Dot-segment normalization must not produce a protocol-relative Location.
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}
