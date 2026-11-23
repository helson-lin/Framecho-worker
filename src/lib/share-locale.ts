import type { Upload } from "@/db/schema";

/** The same set Framecho ships: English, Simplified and Traditional Chinese, Russian, Japanese, Korean. */
export type ShareLocale = "en" | "zh-Hans" | "zh-Hant" | "ru" | "ja" | "ko";

const dateLocales: Record<ShareLocale, string> = {
  en: "en-US",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
  ru: "ru",
  ja: "ja",
  ko: "ko",
};

/**
 * The first language in Accept-Language that the share page can speak.
 * Decided on the server so the rendered page and the hydrated one agree.
 */
export function pickShareLocale(acceptLanguage: string | null): ShareLocale {
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const entry of ranked) {
    const match = matchShareLocale(entry.tag);
    if (match) return match;
  }
  return "en";
}

function matchShareLocale(tag: string): ShareLocale | null {
  if (
    tag === "zh-hant" ||
    tag.startsWith("zh-hant-") ||
    tag === "zh-tw" ||
    tag.startsWith("zh-tw-") ||
    tag === "zh-hk" ||
    tag.startsWith("zh-hk-") ||
    tag === "zh-mo" ||
    tag.startsWith("zh-mo-")
  ) {
    return "zh-Hant";
  }
  if (tag === "zh" || tag.startsWith("zh-")) return "zh-Hans";
  if (tag === "ru" || tag.startsWith("ru-")) return "ru";
  if (tag === "ja" || tag.startsWith("ja-")) return "ja";
  if (tag === "ko" || tag.startsWith("ko-")) return "ko";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return null;
}

export function shareLanguageTag(locale: ShareLocale): string {
  return locale;
}

export const shareStrings = {
  "zh-Hans": {
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
    notFoundTitle: "找不到分享",
    notFoundDetail: "这张截图或这段录屏已经无法查看。",
    sharedBy: "由 {name} 通过 Framecho 分享",
    sharedVia: "通过 Framecho 分享",
  },
  "zh-Hant": {
    downloadImage: "下載原圖",
    downloadVideo: "下載影片",
    copyMarkdown: "複製 Markdown",
    copyLink: "複製連結",
    shareLink: "分享連結…",
    copied: "已複製",
    markdownCopied: "已複製 Markdown",
    linkCopied: "已複製連結",
    imageCopied: "已複製圖片",
    moreActions: "更多操作",
    copyImage: "複製圖片",
    fullscreen: "全螢幕檢視",
    zoom: "縮放",
    fit: "配合",
    actualSize: "原始尺寸",
    viewActualSize: "以原始尺寸檢視",
    fitToView: "配合畫面",
    zoomHint: "點一下圖片即可檢視原始尺寸",
    fitHint: "再點一下即可回到配合畫面",
    copyFailed: "無法複製。請允許瀏覽器使用剪貼簿後再試。",
    copyImageFailed: "無法複製圖片。可以改為下載原圖。",
    fullscreenUnavailable: "此瀏覽器不支援全螢幕檢視",
    imageFailed: "圖片無法載入",
    retry: "重試",
    media: "媒體內容",
    notFoundTitle: "找不到分享",
    notFoundDetail: "這張螢幕截圖或這段螢幕錄影已無法使用。",
    sharedBy: "由 {name} 透過 Framecho 分享",
    sharedVia: "透過 Framecho 分享",
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
    notFoundTitle: "Share not found",
    notFoundDetail: "This screenshot or recording is no longer available.",
    sharedBy: "Shared by {name} via Framecho",
    sharedVia: "Shared via Framecho",
  },
  ru: {
    downloadImage: "Скачать оригинал",
    downloadVideo: "Скачать видео",
    copyMarkdown: "Копировать Markdown",
    copyLink: "Копировать ссылку",
    shareLink: "Поделиться ссылкой…",
    copied: "Скопировано",
    markdownCopied: "Markdown скопирован",
    linkCopied: "Ссылка скопирована",
    imageCopied: "Изображение скопировано",
    moreActions: "Другие действия",
    copyImage: "Копировать изображение",
    fullscreen: "На весь экран",
    zoom: "Масштаб",
    fit: "Вписать",
    actualSize: "Исходный размер",
    viewActualSize: "Показать в исходном размере",
    fitToView: "Вписать в окно",
    zoomHint: "Нажмите на изображение, чтобы открыть его в исходном размере",
    fitHint: "Нажмите ещё раз, чтобы вписать",
    copyFailed: "Не удалось скопировать. Разрешите доступ к буферу обмена и повторите.",
    copyImageFailed: "Не удалось скопировать изображение. Его можно скачать.",
    fullscreenUnavailable: "Этот браузер не поддерживает полноэкранный режим.",
    imageFailed: "Не удалось загрузить изображение.",
    retry: "Повторить",
    media: "Медиафайл",
    notFoundTitle: "Публикация не найдена",
    notFoundDetail: "Этот снимок или запись больше недоступны.",
    sharedBy: "{name} поделился через Framecho",
    sharedVia: "Опубликовано через Framecho",
  },
  ja: {
    downloadImage: "元の画像をダウンロード",
    downloadVideo: "ビデオをダウンロード",
    copyMarkdown: "Markdown をコピー",
    copyLink: "リンクをコピー",
    shareLink: "リンクを共有…",
    copied: "コピーしました",
    markdownCopied: "Markdown をコピーしました",
    linkCopied: "リンクをコピーしました",
    imageCopied: "画像をコピーしました",
    moreActions: "その他の操作",
    copyImage: "画像をコピー",
    fullscreen: "フルスクリーン",
    zoom: "拡大縮小",
    fit: "合わせる",
    actualSize: "原寸",
    viewActualSize: "原寸で表示",
    fitToView: "画面に合わせる",
    zoomHint: "画像をクリックすると原寸で表示します",
    fitHint: "もう一度クリックすると画面に合わせます",
    copyFailed: "コピーできませんでした。クリップボードへのアクセスを許可して、もう一度お試しください。",
    copyImageFailed: "画像をコピーできませんでした。ダウンロードできます。",
    fullscreenUnavailable: "このブラウザはフルスクリーンに対応していません。",
    imageFailed: "画像を読み込めませんでした。",
    retry: "再試行",
    media: "共有メディア",
    notFoundTitle: "共有が見つかりません",
    notFoundDetail: "このスクリーンショットまたは画面収録は利用できなくなりました。",
    sharedBy: "{name} さんが Framecho で共有",
    sharedVia: "Framecho で共有",
  },
  ko: {
    downloadImage: "원본 이미지 다운로드",
    downloadVideo: "비디오 다운로드",
    copyMarkdown: "Markdown 복사",
    copyLink: "링크 복사",
    shareLink: "링크 공유…",
    copied: "복사됨",
    markdownCopied: "Markdown을 복사했습니다",
    linkCopied: "링크를 복사했습니다",
    imageCopied: "이미지를 복사했습니다",
    moreActions: "기타 작업",
    copyImage: "이미지 복사",
    fullscreen: "전체 화면",
    zoom: "확대/축소",
    fit: "맞추기",
    actualSize: "실제 크기",
    viewActualSize: "실제 크기로 보기",
    fitToView: "화면에 맞추기",
    zoomHint: "이미지를 클릭하면 실제 크기로 봅니다",
    fitHint: "다시 클릭하면 화면에 맞춥니다",
    copyFailed: "복사하지 못했습니다. 클립보드 접근을 허용한 뒤 다시 시도하세요.",
    copyImageFailed: "이미지를 복사하지 못했습니다. 대신 다운로드할 수 있습니다.",
    fullscreenUnavailable: "이 브라우저는 전체 화면을 지원하지 않습니다.",
    imageFailed: "이미지를 불러오지 못했습니다.",
    retry: "다시 시도",
    media: "공유 미디어",
    notFoundTitle: "공유를 찾을 수 없습니다",
    notFoundDetail: "이 스크린샷이나 화면 녹화는 더 이상 사용할 수 없습니다.",
    sharedBy: "{name} 님이 Framecho로 공유",
    sharedVia: "Framecho로 공유",
  },
} satisfies Record<ShareLocale, Record<string, string>>;

export function shareDescription(authorName: string | null, locale: ShareLocale): string {
  const strings = shareStrings[locale];
  return authorName ? strings.sharedBy.replaceAll("{name}", authorName) : strings.sharedVia;
}

export type ShareStrings = (typeof shareStrings)["en"];

/** "2026年10月4日" / "October 4, 2026", in UTC so server and client agree. */
export function formatShareDate(createdAt: string, locale: ShareLocale): string {
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(dateLocales[locale], {
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
