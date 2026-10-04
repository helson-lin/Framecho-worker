import type { Upload } from "@/db/schema";

type PreviewUpload = Pick<Upload, "id" | "mediaType" | "posterKey">;

/**
 * The image link unfurls (og:image / twitter:image) point at. A poster wins
 * whenever one was attached: recordings need it, and screenshots uploaded
 * as AVIF send a JPEG poster because several chat-app crawlers can't render
 * AVIF. Screenshots without one fall back to the image itself.
 */
export function sharePreviewImage(
  upload: PreviewUpload,
  origin: string,
): string | null {
  const id = encodeURIComponent(upload.id);
  if (upload.posterKey) return new URL(`/api/poster/${id}`, origin).href;
  if (upload.mediaType === "video") return null;
  return new URL(`/api/image/${id}`, origin).href;
}
