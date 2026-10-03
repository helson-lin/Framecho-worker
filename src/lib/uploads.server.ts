import { initializeSchema } from "@/lib/schema.server";
import { count, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import type { Upload } from "@/db/schema";
import type { Transcript } from "@/lib/transcript";
import { db } from "@/db";
import { likes, uploads } from "@/db/schema";
import { parseTranscript } from "@/lib/transcript";

export const WORKER_VERSION = "1.0.0";

export interface Author {
  name: string;
  avatar: string;
}

export function getAuthor(): Author {
  const configuredName = Reflect.get(env, "AUTHOR_NAME");
  const configuredAvatar = Reflect.get(env, "AUTHOR_AVATAR");

  return {
    name:
      typeof configuredName === "string" && configuredName
        ? configuredName
        : "Anonymous",
    avatar:
      typeof configuredAvatar === "string" && configuredAvatar
        ? configuredAvatar
        : "https://api.dicebear.com/10.x/glyphs/svg?seed=Screendrop",
  };
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

/** Transcript sidecar from R2, already validated; null when absent. */
export async function getTranscript(
  upload: Upload,
): Promise<Transcript | null> {
  if (!upload.transcriptKey) return null;
  const object = await env.BUCKET.get(upload.transcriptKey);
  if (!object) return null;
  try {
    return parseTranscript(await object.json());
  } catch {
    return null;
  }
}

export function ensureSchema(): Promise<Array<string>> {
  return initializeSchema(env.DB);
}

/**
 * Like total for a share. Tolerates the likes table not existing yet
 * (fresh deployment before any API call has run ensureSchema) so the
 * page loader stays fast and never 500s over a count.
 */
export async function getLikeCount(uploadId: string): Promise<number> {
  try {
    const [row] = await db
      .select({ total: count() })
      .from(likes)
      .where(eq(likes.uploadId, uploadId));
    return row.total;
  } catch {
    return 0;
  }
}

export function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith("video/");
}
