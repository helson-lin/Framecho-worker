import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"
import type { NewUpload } from "@/db/schema"
import { db } from "@/db"
import { uploads } from "@/db/schema"
import { json, optionsResponse, protectedApi } from "@/lib/api.server"
import { ensureSchema } from "@/lib/uploads.server"
import { storeUpload } from "@/lib/store-upload"
import {
  newUploadId,
  parseFilename,
  parseMediaType,
  parseOptionalNumber,
  parseSocialEnabled,
  parseTitle,
} from "@/lib/upload-input"

async function saveUpload(
  request: Request,
  body: ReadableStream,
  metadata: Omit<NewUpload, "id" | "r2Key" | "size">,
) {
  await ensureSchema()
  const id = newUploadId()
  const filename = metadata.filename
  const r2Key = `uploads/${id}/${filename}`
  const object = await storeUpload(
    env.BUCKET,
    r2Key,
    body,
    {
      httpMetadata: { contentType: metadata.contentType },
      customMetadata: { originalName: filename },
    },
    (stored) =>
      db.insert(uploads).values({ ...metadata, id, r2Key, size: stored.size }),
  )
  const origin = new URL(request.url).origin
  return json({ id, url: `${origin}/${id}`, filename, size: object.size }, 201)
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        protectedApi(request, env.UPLOAD_TOKEN, async () => {
          const formData = await request.formData()
          const file = formData.get("file")
          if (!(file instanceof File))
            return json({ error: "No file provided" }, 400)
          const filename = parseFilename(file.name)
          const contentType = file.type || "application/octet-stream"
          const rawTitle = formData.get("title")
          // Validate all metadata before any R2 or D1 write.
          const metadata = {
            filename,
            contentType,
            mediaType: parseMediaType(formData.get("media_type"), contentType),
            width: parseOptionalNumber(formData.get("width"), "width", true),
            height: parseOptionalNumber(formData.get("height"), "height", true),
            duration: parseOptionalNumber(formData.get("duration"), "duration"),
            title: parseTitle(typeof rawTitle === "string" ? rawTitle : null),
            socialEnabled: parseSocialEnabled(formData.get("social_enabled")),
          }
          return saveUpload(request, file.stream(), metadata)
        }),
      PUT: async ({ request }) =>
        protectedApi(request, env.UPLOAD_TOKEN, async () => {
          const filename = parseFilename(request.headers.get("x-filename"))
          if (!request.body)
            return json({ error: "Request body is required" }, 400)
          const contentType =
            request.headers.get("content-type") || "application/octet-stream"
          const metadata = {
            filename,
            contentType,
            mediaType: parseMediaType(
              request.headers.get("x-media-type"),
              contentType,
            ),
            width: parseOptionalNumber(
              request.headers.get("x-width"),
              "width",
              true,
            ),
            height: parseOptionalNumber(
              request.headers.get("x-height"),
              "height",
              true,
            ),
            duration: parseOptionalNumber(
              request.headers.get("x-duration"),
              "duration",
            ),
            title: parseTitle(request.headers.get("x-title"), true),
            socialEnabled: parseSocialEnabled(
              request.headers.get("x-social-enabled"),
            ),
          }
          return saveUpload(request, request.body, metadata)
        }),
      OPTIONS: () => optionsResponse(),
    },
  },
})
