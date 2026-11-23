import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { comments, likes, uploads, viewEvents } from "@/db/schema"
import { json, optionsResponse, protectedApi } from "@/lib/api.server"
import { replaceStoredObject } from "@/lib/store-upload"
import { isUploadId, parseStreamMetadata } from "@/lib/upload-input"
import { ensureSchema, getUploadById } from "@/lib/uploads.server"

/**
 * Deletes an upload entirely: the main file and any sidecars (poster,
 * transcript, storyboard) from R2, plus the upload's own row and its
 * comments/likes/view-event rows from D1. Irreversible — the share link
 * 404s immediately after.
 */
export const Route = createFileRoute("/api/upload/$id")({
  server: {
    handlers: {
      // Replaces the media behind an existing share. The id and public URL stay.
      PUT: async ({ params, request }) =>
        protectedApi(request, env.UPLOAD_TOKEN, async () => {
          if (!isUploadId(params.id)) {
            return json({ error: "Upload not found" }, 404)
          }
          await ensureSchema()
          const upload = await getUploadById(params.id)
          if (!upload) return json({ error: "Upload not found" }, 404)
          if (!request.body) {
            return json({ error: "Request body is required" }, 400)
          }
          const metadata = parseStreamMetadata(request.headers)
          const r2Key = `uploads/${upload.id}/${metadata.filename}`
          const object = await replaceStoredObject(
            env.BUCKET,
            upload.r2Key,
            r2Key,
            request.body,
            {
              httpMetadata: { contentType: metadata.contentType },
              customMetadata: { originalName: metadata.filename },
            },
            (stored) =>
              db
                .update(uploads)
                .set({
                  filename: metadata.filename,
                  contentType: metadata.contentType,
                  size: stored.size,
                  width: metadata.width,
                  height: metadata.height,
                  r2Key,
                  mediaType: metadata.mediaType,
                  duration: metadata.duration,
                  contentRevision: upload.contentRevision + 1,
                  ...(metadata.titleProvided ? { title: metadata.title } : {}),
                  ...(metadata.socialProvided
                    ? { socialEnabled: metadata.socialEnabled }
                    : {}),
                })
                .where(eq(uploads.id, upload.id)),
          )
          const origin = new URL(request.url).origin
          return json(
            {
              id: upload.id,
              url: `${origin}/${upload.id}`,
              filename: metadata.filename,
              size: object.size,
            },
            200,
          )
        }),

      DELETE: async ({ params, request }) =>
        protectedApi(request, env.UPLOAD_TOKEN, async () => {
          await ensureSchema()

          const upload = await getUploadById(params.id)
          if (!upload) {
            return json({ error: "Upload not found" }, 404)
          }

          const keys = [
            upload.r2Key,
            upload.posterKey,
            upload.transcriptKey,
            upload.storyboardKey,
          ].filter((key): key is string => Boolean(key))
          if (keys.length > 0) {
            await env.BUCKET.delete(keys)
          }

          await db.delete(comments).where(eq(comments.uploadId, upload.id))
          await db.delete(likes).where(eq(likes.uploadId, upload.id))
          await db
            .delete(viewEvents)
            .where(eq(viewEvents.uploadId, upload.id))
          await db.delete(uploads).where(eq(uploads.id, upload.id))

          return json({ deleted: true })
        }),

      OPTIONS: () => optionsResponse(),
    },
  },
})
