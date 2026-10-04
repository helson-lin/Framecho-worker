import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./load-module.mjs";

const {
  module: { pickShareLocale, formatShareDate, formatLabel, shareMetadata, shareStrings },
} = await loadModule("src/lib/share-locale.ts");

test("viewers whose browser prefers Chinese get Chinese, everyone else English", () => {
  assert.equal(pickShareLocale("zh-CN,zh;q=0.9,en;q=0.8"), "zh");
  assert.equal(pickShareLocale("zh-TW"), "zh");
  assert.equal(pickShareLocale("en-US,en;q=0.9,zh-CN;q=0.8"), "en");
  assert.equal(pickShareLocale("en;q=0.5, zh-Hans;q=0.9"), "zh");
  assert.equal(pickShareLocale("zh;q=0, en"), "en");
  assert.equal(pickShareLocale(""), "en");
  assert.equal(pickShareLocale(null), "en");
});

test("both languages define every string", () => {
  assert.deepEqual(Object.keys(shareStrings.zh).sort(), Object.keys(shareStrings.en).sort());
});

test("dates are long-form and pinned to UTC, so server and client agree", () => {
  assert.equal(formatShareDate("2026-10-04 23:30:00", "zh"), "2026年10月4日");
  assert.equal(formatShareDate("2026-10-04 23:30:00", "en"), "October 4, 2026");
  assert.equal(formatShareDate("not a date", "en"), "");
});

test("format labels come from the content type, then the file name", () => {
  assert.equal(formatLabel("image/avif", "a.avif"), "AVIF");
  assert.equal(formatLabel("image/png", "a.png"), "PNG");
  assert.equal(formatLabel("video/quicktime", "a.mov"), "MOV");
  assert.equal(formatLabel("application/octet-stream", "a.webm"), "WEBM");
  assert.equal(formatLabel("application/octet-stream", "noextension"), null);
});

test("metadata reads type · size in pixels · bytes or duration", () => {
  const base = { contentType: "image/avif", filename: "a.avif", width: 3854, height: 2566, size: 446_000, duration: null };
  assert.equal(shareMetadata({ ...base, mediaType: "image" }), "AVIF · 3854 × 2566 · 436 KB");
  assert.equal(
    shareMetadata({ ...base, contentType: "video/mp4", filename: "a.mp4", mediaType: "video", duration: 8.2 }),
    "MP4 · 3854 × 2566 · 0:08",
  );
  assert.equal(
    shareMetadata({ ...base, mediaType: "image", width: null, height: null, size: 3_500_000 }),
    "AVIF · 3.3 MB",
  );
});
