import { SkeletonLine } from "@cloudflare/kumo";
import { Button } from "@cloudflare/kumo/components/button";
import { useEffect, useRef, useState } from "react";

interface LazyShareImageProps {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
}

/** Keep the image in layout so native lazy loading can observe its viewport. */
export function LazyShareImage({
  src,
  alt,
  width,
  height,
}: LazyShareImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const requestSource = attempt
    ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`
    : src;

  useEffect(() => {
    const image = imageRef.current;
    // complete is also true for broken images; only a valid image is ready.
    if (image?.complete) setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, [requestSource]);

  return (
    <div className="relative h-full w-full" aria-busy={status === "loading"}>
      {status === "loading" && (
        <div className="absolute inset-0" aria-hidden="true">
          <SkeletonLine
            minWidth={100}
            maxWidth={100}
            minDuration={1.5}
            maxDuration={1.5}
            minDelay={0}
            maxDelay={0}
            className="h-full w-full"
          />
        </div>
      )}
      <img
        ref={imageRef}
        src={requestSource}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={width && width > 0 ? width : undefined}
        height={height && height > 0 ? height : undefined}
        aria-hidden={status !== "loaded"}
        className={`block h-full w-full object-contain motion-safe:transition-opacity motion-safe:duration-200 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "error" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
          role="alert"
        >
          <p className="text-sm text-neutral-600">Image could not be loaded.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
