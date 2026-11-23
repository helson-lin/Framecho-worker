import type { Upload } from "@/db/schema";
import { shareAssetURL } from "@/lib/share-url";

type PreviewUpload = Pick<Upload, "id" | "mediaType" | "posterKey"> & {
  contentRevision?: number | null
}

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
  if (upload.posterKey) {
    return shareAssetURL(origin, `/api/poster/${id}`, upload.contentRevision)
  }
  if (upload.mediaType === "video") return null;
  return shareAssetURL(origin, `/api/image/${id}`, upload.contentRevision)
}
