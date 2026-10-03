import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./load-module.mjs";

const {
  module: { buildShareMarkdown },
} = await loadModule("src/lib/share-markdown.ts");
const upload = {
  id: "0123456789abcdef0123456789abcdef",
  filename: "截图.png",
  title: null,
  mediaType: "image",
  posterKey: null,
};
const origin = "https://screen.jarin.me";

test("images embed the raw image endpoint, with filename as the default label", () => {
  assert.equal(
    buildShareMarkdown(upload, origin),
    `![截图.png](<${origin}/api/image/${upload.id}>)`,
  );
});

test("videos with posters embed a cover linked to the playable share page", () => {
  assert.equal(
    buildShareMarkdown(
      { ...upload, mediaType: "video", posterKey: "poster.jpg", title: "演示" },
      origin,
    ),
    `[![演示](<${origin}/api/poster/${upload.id}>)](<${origin}/${upload.id}>)`,
  );
});

test("videos without posters fall back to a portable Markdown link", () => {
  assert.equal(
    buildShareMarkdown(
      { ...upload, mediaType: "video", title: "演示" },
      origin,
    ),
    `[演示](<${origin}/${upload.id}>)`,
  );
});

test("titles cannot introduce Markdown links, HTML, formatting, or extra lines", () => {
  const title = "  [演示](https://example.com)\n <img> *测试* &amp; \\  ";
  assert.equal(
    buildShareMarkdown({ ...upload, title }, origin),
    `![\\[演示\\](https://example.com) \\<img\\> \\*测试\\* \\&amp; \\\\](<${origin}/api/image/${upload.id}>)`,
  );
});
