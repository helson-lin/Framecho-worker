import type { Upload } from "@/db/schema";

export type ShareLocale = "zh" | "en";

/**
 * The share page speaks Chinese to viewers whose browser prefers it and
 * English to everyone else. Decided on the server from Accept-Language so
 * the rendered page and the hydrated one agree.
 */
export function pickShareLocale(acceptLanguage: string | null): ShareLocale {
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .at(0);
  return preferred?.tag.startsWith("zh") ? "zh" : "en";
}

export const shareStrings = {
  zh: {
    downloadImage: "下载原图",
    downloadVideo: "下载视频",
    copyMarkdown: "复制 Markdown",
    copyLink: "复制链接",
    shareLink: "分享链接…",
    copied: "已复制",
    markdownCopied: "Markdown 已复制",
    linkCopied: "链接已复制",
    imageCopied: "图片已复制",
    moreActions: "更多操作",
    copyImage: "复制图片",
    fullscreen: "全屏查看",
    zoom: "缩放",
    fit: "适配",
    actualSize: "原尺寸",
    viewActualSize: "以原尺寸查看",
    fitToView: "适配画面",
    zoomHint: "点击图片查看原尺寸",
    fitHint: "再次点击回到适配画面",
    copyFailed: "复制失败，请允许浏览器访问剪贴板",
    copyImageFailed: "复制图片失败，可以下载原图",
    fullscreenUnavailable: "此浏览器不支持全屏查看",
    imageFailed: "图片加载失败",
    retry: "重试",
    media: "媒体内容",
  },
  en: {
    downloadImage: "Download",
    downloadVideo: "Download",
    copyMarkdown: "Copy Markdown",
    copyLink: "Copy link",
    shareLink: "Share link…",
    copied: "Copied",
    markdownCopied: "Markdown copied",
    linkCopied: "Link copied",
    imageCopied: "Image copied",
    moreActions: "More actions",
    copyImage: "Copy image",
    fullscreen: "Full screen",
    zoom: "Zoom",
    fit: "Fit",
    actualSize: "Actual size",
    viewActualSize: "View at actual size",
    fitToView: "Fit to view",
    zoomHint: "Click the image to view it at actual size",
    fitHint: "Click again to fit",
    copyFailed: "Couldn't copy. Allow clipboard access and try again.",
    copyImageFailed: "Couldn't copy the image. You can download it instead.",
    fullscreenUnavailable: "Full screen isn't available in this browser.",
    imageFailed: "The image couldn't be loaded.",
    retry: "Retry",
    media: "Shared media",
  },
} satisfies Record<ShareLocale, Record<string, string>>;

export type ShareStrings = (typeof shareStrings)["en"];

/** "2026年10月4日" / "October 4, 2026", in UTC so server and client agree. */
export function formatShareDate(createdAt: string, locale: ShareLocale): string {
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

/** "PNG", "AVIF", "MP4" — from the stored content type, else the file name. */
export function formatLabel(contentType: string, filename: string): string | null {
  const subtype = contentType.split("/")[1]?.split(";")[0]?.trim().toLowerCase();
  const known: Record<string, string> = {
    quicktime: "MOV",
    "x-matroska": "MKV",
    jpeg: "JPEG",
    "svg+xml": "SVG",
  };
  if (subtype && subtype !== "octet-stream") {
    return known[subtype] ?? subtype.toUpperCase();
  }
  const extension = filename.split(".").pop();
  return extension && extension !== filename ? extension.toUpperCase() : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `0:08` / `1:02:45`. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = String(safe % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remaining}`
    : `${minutes}:${remaining}`;
}

type MetadataUpload = Pick<
  Upload,
  "contentType" | "filename" | "width" | "height" | "size" | "duration" | "mediaType"
>;

/** "PNG · 1200 × 750 · 52 KB" for images, "MP4 · 1200 × 750 · 0:08" for videos. */
export function shareMetadata(upload: MetadataUpload): string {
  const dimensions =
    upload.width && upload.height ? `${upload.width} × ${upload.height}` : null;
  const tail =
    upload.mediaType === "video"
      ? upload.duration
        ? formatDuration(upload.duration)
        : null
      : formatBytes(upload.size);
  return [formatLabel(upload.contentType, upload.filename), dimensions, tail]
    .filter(Boolean)
    .join(" · ");
}
