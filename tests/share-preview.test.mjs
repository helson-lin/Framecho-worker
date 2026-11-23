import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./load-module.mjs";

const { url: shareURL } = await loadModule("src/lib/share-url.ts");
const {
  module: { sharePreviewImage },
} = await loadModule("src/lib/share-preview.ts", {
  "@/lib/share-url": shareURL,
});
const origin = "https://screen.jarin.me";
const id = "0123456789abcdef0123456789abcdef";

test("screenshots without a poster unfurl with the image itself", () => {
  assert.equal(
    sharePreviewImage({ id, mediaType: "image", posterKey: null }, origin),
    `${origin}/api/image/${id}`,
  );
});

test("AVIF screenshots unfurl with their JPEG poster", () => {
  assert.equal(
    sharePreviewImage(
      { id, mediaType: "image", posterKey: `uploads/${id}/poster.jpg` },
      origin,
    ),
    `${origin}/api/poster/${id}`,
  );
});

test("a replaced screenshot unfurls with a cache-busting query", () => {
  assert.equal(
    sharePreviewImage(
      { id, mediaType: "image", posterKey: null, contentRevision: 3 },
      origin,
    ),
    `${origin}/api/image/${id}?v=3`,
  );
});

test("recordings unfurl with their poster, or with no image at all", () => {
  assert.equal(
    sharePreviewImage({ id, mediaType: "video", posterKey: "poster.jpg" }, origin),
    `${origin}/api/poster/${id}`,
  );
  assert.equal(
    sharePreviewImage({ id, mediaType: "video", posterKey: null }, origin),
    null,
  );
});
