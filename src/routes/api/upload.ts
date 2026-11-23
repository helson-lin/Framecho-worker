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
  parseStreamMetadata,
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
          if (!request.body)
            return json({ error: "Request body is required" }, 400)
          const parsed = parseStreamMetadata(request.headers)
          return saveUpload(request, request.body, {
            filename: parsed.filename,
            contentType: parsed.contentType,
            mediaType: parsed.mediaType,
            width: parsed.width,
            height: parsed.height,
            duration: parsed.duration,
            title: parsed.title,
            socialEnabled: parsed.socialEnabled,
          })
        }),
      OPTIONS: () => optionsResponse(),
    },
  },
})
