import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./load-module.mjs";

const {
  module: { sharePreviewImage },
} = await loadModule("src/lib/share-preview.ts");
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
