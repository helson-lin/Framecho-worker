import type { Upload } from "@/db/schema";

type MarkdownUpload = Pick<
  Upload,
  "id" | "title" | "filename" | "mediaType" | "posterKey"
>;

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

  if (upload.mediaType === "video") {
    if (upload.posterKey) {
      const posterUrl = new URL(`/api/poster/${id}`, origin).href;
      return `[![${label}](<${posterUrl}>)](<${shareUrl}>)`;
    }
    return `[${label}](<${shareUrl}>)`;
  }

  const imageUrl = new URL(`/api/image/${id}`, origin).href;
  return `![${label}](<${imageUrl}>)`;
}
