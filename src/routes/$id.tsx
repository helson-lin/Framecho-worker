import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestUrl } from "@tanstack/react-start/server";
import { isUploadId } from "@/lib/upload-input";
import { SharePage } from "@/components/share-page";
import { pickShareLocale } from "@/lib/share-locale";
import { sharePreviewImage } from "@/lib/share-preview";
import { getAuthorName, getUploadById } from "@/lib/uploads.server";

const loadShare = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const upload = await getUploadById(id);
    if (!upload) return null;

    return {
      upload,
      authorName: getAuthorName(),
      origin: getRequestUrl().origin,
      // Chosen here so the server-rendered page and the hydrated one
      // speak the same language.
      locale: pickShareLocale(getRequest().headers.get("accept-language")),
    };
  });

export const Route = createFileRoute("/$id")({
  loader: async ({ params }) => {
    if (!isUploadId(params.id)) throw notFound();
    const share = await loadShare({ data: params.id });
    if (!share) throw notFound();
    return share;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const { upload, authorName, origin } = loaderData;
    const isVideo = upload.mediaType === "video";
    const displayTitle = upload.title?.trim() || upload.filename;
    const dimensions =
      upload.width && upload.height
        ? ` · ${upload.width} × ${upload.height}`
        : "";
    const duration = upload.duration
      ? ` · ${Math.round(upload.duration)}s`
      : "";
    const sharedBy = authorName ? `Shared by ${authorName} via Framecho` : "Shared via Framecho";
    const description = `${sharedBy}${duration}${dimensions}`;
    const title = `${displayTitle} — Framecho`;
    const previewImage = sharePreviewImage(upload, origin);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: isVideo ? "video.other" : "website" },
        ...(isVideo
          ? [
              {
                property: "og:video",
                content: `${origin}/api/media/${upload.id}`,
              },
              { property: "og:video:type", content: upload.contentType },
              ...(upload.width && upload.height
                ? [
                    {
                      property: "og:video:width",
                      content: String(upload.width),
                    },
                    {
                      property: "og:video:height",
                      content: String(upload.height),
                    },
                  ]
                : []),
            ]
          : []),
        ...(previewImage
          ? [
              { property: "og:image", content: previewImage },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:title", content: title },
              { name: "twitter:description", content: description },
              { name: "twitter:image", content: previewImage },
            ]
          : []),
      ],
    };
  },
  component: SharedMediaPage,
  notFoundComponent: ShareNotFound,
});

function SharedMediaPage() {
  return <SharePage {...Route.useLoaderData()} />;
}

function ShareNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 px-6 text-center dark:bg-neutral-950">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Share not found
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          This screenshot or recording is no longer available.
        </p>
      </div>
    </main>
  );
}
