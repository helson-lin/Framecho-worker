import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import versionManifest from "../../version.json";
import type { Upload } from "@/db/schema";
import { initializeSchema } from "@/lib/schema.server";
import { db } from "@/db";
import { uploads } from "@/db/schema";

export const WORKER_VERSION = versionManifest.version;

/** The share page's byline: `AUTHOR_NAME` when configured, else no name. */
export function getAuthorName(): string | null {
  const configuredName = Reflect.get(env, "AUTHOR_NAME");
  return typeof configuredName === "string" && configuredName.trim()
    ? configuredName.trim()
    : null;
}

export async function getUploadById(id: string): Promise<Upload | null> {
  const row = await db.query.uploads.findFirst({
    where: eq(uploads.id, id),
  });

  if (!row) return null;

  return {
    ...row,
    mediaType:
      row.mediaType ||
      (row.contentType.startsWith("video/") ? "video" : "image"),
  };
}

export function ensureSchema(): Promise<Array<string>> {
  return initializeSchema(env.DB);
}

export function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith("video/");
}
