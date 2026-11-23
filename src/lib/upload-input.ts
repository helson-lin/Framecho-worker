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

export interface StreamUploadMetadata {
  filename: string
  contentType: string
  mediaType: "image" | "video"
  width: number | null
  height: number | null
  duration: number | null
  title: string | null
  titleProvided: boolean
  socialEnabled: boolean
  socialProvided: boolean
}

/** Headers for `PUT /api/upload` and `PUT /api/upload/:id`. */
export function parseStreamMetadata(headers: Headers): StreamUploadMetadata {
  const contentType = headers.get("content-type") || "application/octet-stream"
  return {
    filename: parseFilename(headers.get("x-filename")),
    contentType,
    mediaType: parseMediaType(headers.get("x-media-type"), contentType),
    width: parseOptionalNumber(headers.get("x-width"), "width", true),
    height: parseOptionalNumber(headers.get("x-height"), "height", true),
    duration: parseOptionalNumber(headers.get("x-duration"), "duration"),
    title: parseTitle(headers.get("x-title"), true),
    titleProvided: headers.has("x-title"),
    socialEnabled: parseSocialEnabled(headers.get("x-social-enabled")),
    socialProvided: headers.has("x-social-enabled"),
  }
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
