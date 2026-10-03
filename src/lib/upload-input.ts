export class InputError extends Error {}

export function newUploadId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

/** Keep existing links working alongside new 128-bit identifiers. */
export function isUploadId(value: string): boolean {
  return /^(?:[a-f0-9]{8}|[a-f0-9]{32})$/.test(value);
}

export function parseOptionalNumber(
  value: FormDataEntryValue | string | null,
  name: string,
  integer = false,
): number | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new InputError(`Invalid ${name}`);
  }
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    (integer && !Number.isSafeInteger(number))
  ) {
    throw new InputError(`Invalid ${name}`);
  }
  return number;
}

export function parseTitle(
  value: string | null,
  encoded = false,
): string | null {
  if (!value) return null;
  try {
    return (
      (encoded ? decodeURIComponent(value) : value).trim().slice(0, 200) || null
    );
  } catch {
    throw new InputError("X-Title must be valid percent-encoded UTF-8");
  }
}

export function parseMediaType(
  value: FormDataEntryValue | string | null,
  contentType: string,
): "image" | "video" {
  if (value === null || value === "")
    return contentType.startsWith("video/") ? "video" : "image";
  if (value !== "image" && value !== "video")
    throw new InputError("Invalid media type");
  return value;
}

export function parseFilename(value: string | null): string {
  if (
    !value ||
    value.length > 255 ||
    value.includes("/") ||
    value.includes("\\") ||
    Array.from(value).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    value === "." ||
    value === ".."
  ) {
    throw new InputError("A valid filename is required");
  }
  return value;
}

export function parseSocialEnabled(
  value: FormDataEntryValue | string | null,
): boolean {
  if (value === null || value === "") return true;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new InputError("Invalid social_enabled");
}
