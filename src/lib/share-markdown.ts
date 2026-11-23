import type { Upload } from "@/db/schema";
import { shareAssetURL } from "@/lib/share-url";

type MarkdownUpload = Pick<
  Upload,
  "id" | "title" | "filename" | "mediaType" | "posterKey"
> & { contentRevision?: number | null };

export function buildShareMarkdown(
  upload: MarkdownUpload,
  origin: string,
): string {
  // Keep the label on one line and prevent filenames from becoming Markdown.
  const label = (upload.title?.trim() || upload.filename || "Framecho")
    .replace(/\s+/g, " ")
    .replace(/[\\[\]`*_<>!&]/g, "\\$&");
  const id = encodeURIComponent(upload.id);
  const shareUrl = new URL(`/${id}`, origin).href;
  const revision = upload.contentRevision;

  if (upload.mediaType === "video") {
    if (upload.posterKey) {
      const posterUrl = shareAssetURL(origin, `/api/poster/${id}`, revision);
      return `[![${label}](<${posterUrl}>)](<${shareUrl}>)`;
    }
    return `[${label}](<${shareUrl}>)`;
  }

  const imageUrl = shareAssetURL(origin, `/api/image/${id}`, revision);
  return `![${label}](<${imageUrl}>)`;
}
