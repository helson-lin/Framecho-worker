import {
  CheckIcon,
  CopyIcon,
  CornersOutIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  ImageIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { Upload } from "@/db/schema";
import type { ShareLocale } from "@/lib/share-locale";
import { VideoPlayer } from "@/components/video-player";
import { buildShareMarkdown } from "@/lib/share-markdown";
import {
  formatShareDate,
  shareMetadata,
  shareStrings,
} from "@/lib/share-locale";
import { recordShareView } from "@/lib/viewer-identity";

interface SharePageProps {
  upload: Upload;
  authorName: string | null;
  origin: string;
  locale: ShareLocale;
}

/**
 * The share page for both screenshots and recordings: one column whose
 * width follows the media, a quiet title row, and the media itself at its
 * own aspect ratio. Download is the only filled action; Copy Markdown sits
 * beside it, and everything occasional lives in the More menu.
 */
export function SharePage({ upload, authorName, origin, locale }: SharePageProps) {
  const t = shareStrings[locale];
  const isVideo = upload.mediaType === "video";
  const mediaSource = `${origin}/api/${isVideo ? "media" : "image"}/${upload.id}`;
  const posterSource = upload.posterKey
    ? `${origin}/api/poster/${upload.id}`
    : undefined;
  const title = upload.title?.trim() || upload.filename;
  const ratio =
    upload.width && upload.height ? upload.width / upload.height : 16 / 9;

  const stageRef = useRef<HTMLDivElement>(null);
  const [original, setOriginal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [done, setDone] = useState<"markdown" | "link" | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Views are still counted for the uploader; the page no longer shows them.
  useEffect(() => {
    void recordShareView(upload.id);
  }, [upload.id]);

  useEffect(
    () => () => {
      clearTimeout(doneTimer.current);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  // Toasts are for failures, and for the one success with no button left
  // to confirm on (Copy image, from the closed menu). Copy Markdown and
  // Copy link confirm on the button itself.
  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    setAnnouncement(message);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const confirm = useCallback((which: "markdown" | "link" | null, message: string) => {
    setAnnouncement(message);
    clearTimeout(doneTimer.current);
    setDone(which);
    doneTimer.current = setTimeout(() => setDone(null), 1800);
  }, []);

  async function copyText(text: string, which: "markdown" | "link" | null, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      confirm(which, message);
    } catch {
      notify(t.copyFailed);
    }
  }

  const copyMarkdown = () =>
    void copyText(buildShareMarkdown(upload, origin), "markdown", t.markdownCopied);
  const copyLink = () => void copyText(window.location.href, "link", t.linkCopied);

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: window.location.href });
      } catch {
        // Dismissing the share sheet is not an error.
      }
      return;
    }
    await copyText(window.location.href, null, t.linkCopied);
  }

  async function copyImage() {
    try {
      // The clipboard only takes PNG everywhere, and screenshots are
      // stored as AVIF, so re-encode. The promise is handed to the
      // ClipboardItem right away to keep Safari's user-gesture window.
      const png = (async () => {
        const blob = await (await fetch(mediaSource)).blob();
        if (blob.type === "image/png") return blob;
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
        bitmap.close();
        return await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (encoded) => (encoded ? resolve(encoded) : reject(new Error("encode"))),
            "image/png",
          ),
        );
      })();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      notify(t.imageCopied);
    } catch {
      notify(t.copyImageFailed);
    }
  }

  async function enterFullscreen() {
    try {
      await stageRef.current?.requestFullscreen();
    } catch {
      notify(t.fullscreenUnavailable);
    }
  }

  return (
    <div
      className="share"
      lang={locale === "zh" ? "zh-CN" : "en"}
      style={{ "--ratio": ratio } as CSSProperties}
    >
      <header className="share-top">
        <a className="share-brand" href="https://github.com/helson-lin/Screendrop">
          <img src="/logo.png" alt="" width={26} height={26} />
          Framecho
        </a>
      </header>

      <main className="share-main">
        <div className="share-heading">
          <div className="share-title-area">
            <h1>{title}</h1>
            <p className="share-meta">
              {[authorName, formatShareDate(upload.createdAt, locale), shareMetadata(upload)]
                .filter(Boolean)
                .map((part, index) => (
                  <span key={index}>
                    {index > 0 && <span className="share-sep" aria-hidden="true">·</span>}
                    {part}
                  </span>
                ))}
            </p>
          </div>

          <div className="share-actions">
            <a
              className="share-button share-button--primary"
              href={mediaSource}
              download={upload.filename}
            >
              <DownloadSimpleIcon aria-hidden="true" />
              {isVideo ? t.downloadVideo : t.downloadImage}
            </a>
            <SwapButton
              className="share-button share-button--secondary"
              done={done === "markdown"}
              icon={<CopyIcon aria-hidden="true" />}
              label={t.copyMarkdown}
              doneLabel={t.copied}
              onClick={copyMarkdown}
            />
            <SwapButton
              className="share-button share-wide-only"
              done={done === "link"}
              icon={<LinkSimpleIcon aria-hidden="true" />}
              label={t.copyLink}
              doneLabel={t.copied}
              onClick={copyLink}
            />
            <MoreMenu label={t.moreActions}>
              {(close) => (
                <>
                  <MenuItem
                    className="share-compact-only"
                    icon={<LinkSimpleIcon aria-hidden="true" />}
                    onSelect={() => {
                      close();
                      void shareLink();
                    }}
                  >
                    {typeof navigator !== "undefined" && "share" in navigator
                      ? t.shareLink
                      : t.copyLink}
                  </MenuItem>
                  {!isVideo && (
                    <MenuItem
                      icon={<ImageIcon aria-hidden="true" />}
                      onSelect={() => {
                        close();
                        void copyImage();
                      }}
                    >
                      {t.copyImage}
                    </MenuItem>
                  )}
                  <MenuItem
                    icon={<CornersOutIcon aria-hidden="true" />}
                    onSelect={() => {
                      close();
                      void enterFullscreen();
                    }}
                  >
                    {t.fullscreen}
                  </MenuItem>
                  {!isVideo && (
                    <>
                      <div className="share-menu-sep" role="separator" />
                      <div className="share-menu-group">
                        <div className="share-menu-label" id="share-zoom-label">
                          {t.zoom}
                        </div>
                        <div className="share-toggle" role="group" aria-labelledby="share-zoom-label">
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={!original}
                            onClick={() => {
                              setOriginal(false);
                              close();
                            }}
                          >
                            {t.fit}
                          </button>
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={original}
                            onClick={() => {
                              setOriginal(true);
                              close();
                            }}
                          >
                            {t.actualSize}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </MoreMenu>
          </div>
        </div>

        <section aria-label={t.media}>
          <div
            ref={stageRef}
            className={`share-stage${original ? " is-original" : ""}${isVideo ? " is-video" : ""}`}
            onKeyDown={(event) => {
              if (event.key === "Escape" && original) setOriginal(false);
            }}
          >
            {isVideo ? (
              <VideoPlayer
                src={mediaSource}
                poster={posterSource}
                layout="fill"
                className="block h-full w-full"
              />
            ) : (
              <ShareImage
                src={mediaSource}
                alt={title}
                width={upload.width}
                height={upload.height}
                original={original}
                onToggle={() => setOriginal((value) => !value)}
                strings={t}
              />
            )}
          </div>
          {!isVideo && (
            <p className="share-hint">{original ? t.fitHint : t.zoomHint}</p>
          )}
        </section>
      </main>

      <div className={`share-toast${toast ? " is-visible" : ""}`} aria-hidden="true">
        {toast}
      </div>
      <div className="share-sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/** A button whose label swaps to "Copied" without changing its width. */
function SwapButton({
  className,
  done,
  icon,
  label,
  doneLabel,
  onClick,
}: {
  className: string;
  done: boolean;
  icon: ReactNode;
  label: string;
  doneLabel: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`${className}${done ? " is-done" : ""}`} onClick={onClick}>
      <span className="share-swap">
        <span className="share-swap-idle">
          {icon}
          {label}
        </span>
        <span className="share-swap-done" aria-hidden="true">
          <CheckIcon aria-hidden="true" />
          {doneLabel}
        </span>
      </span>
    </button>
  );
}

function MoreMenu({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []).filter(
      (item) => item.getClientRects().length > 0,
    );

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const next = !open;
    setOpen(next);
    // Focus moves in only when opened from the keyboard (click detail 0).
    if (next && event.detail === 0) requestAnimationFrame(() => items()[0]?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLButtonElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      list[(index + step + list.length) % list.length]?.focus();
    }
  }

  return (
    <div className="share-more" ref={wrapRef} onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="share-button share-icon-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <DotsThreeIcon weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div className="share-menu" role="menu" ref={menuRef}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  className,
  onSelect,
  children,
}: {
  icon: ReactNode;
  className?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`share-menu-item${className ? ` ${className}` : ""}`}
      onClick={onSelect}
    >
      {icon}
      {children}
    </button>
  );
}

/** The screenshot, lazily loaded with a quiet placeholder and a retry.
 *  Clicking it switches between fitting the column and actual size. */
function ShareImage({
  src,
  alt,
  width,
  height,
  original,
  onToggle,
  strings,
}: {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  original: boolean;
  onToggle: () => void;
  strings: (typeof shareStrings)["en"];
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const requestSource = attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src;

  useEffect(() => {
    const image = imageRef.current;
    // complete is also true for broken images; only a decoded one counts.
    if (image?.complete) setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, [requestSource]);

  return (
    <>
      <button
        type="button"
        className={`share-zoom is-${status}`}
        aria-label={original ? strings.fitToView : strings.viewActualSize}
        onClick={onToggle}
        disabled={status !== "loaded"}
      >
        <img
          ref={imageRef}
          src={requestSource}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={width && width > 0 ? width : undefined}
          height={height && height > 0 ? height : undefined}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      </button>
      {status === "error" && (
        <div className="share-image-error" role="alert">
          <p>{strings.imageFailed}</p>
          <button
            type="button"
            className="share-button share-button--secondary"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            {strings.retry}
          </button>
        </div>
      )}
    </>
  );
}
