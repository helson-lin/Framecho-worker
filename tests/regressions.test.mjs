import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { loadModule } from "./load-module.mjs";

const { module: input, url: inputURL } = await loadModule(
  "src/lib/upload-input.ts",
);
const { module: redirect } = await loadModule("src/lib/redirect.ts");
const { module: api } = await loadModule("src/lib/api.server.ts", {
  "@/lib/upload-input": inputURL,
});
const { source: storageSource } = await loadModule("src/lib/store-upload.ts");
const { module: schema } = await loadModule("src/lib/schema.server.ts");
// Use the local Workers simulator bundled with the project's Wrangler version.
const require = createRequire(import.meta.url);
const { Miniflare } = require(
  require.resolve("miniflare", {
    paths: [require.resolve("wrangler/package.json")],
  }),
);

// Actual URL parsing, including the backslash and normalized // escape cases.
test("login redirects stay on the same origin", () => {
  for (const value of [
    "//evil.invalid",
    "/\\evil.invalid",
    "/\n/evil.invalid",
    "https://evil.invalid",
    "/a/..//evil.invalid",
    null,
  ]) {
    assert.equal(redirect.safeRedirectPath(value), "/");
  }
  assert.equal(
    redirect.safeRedirectPath("/abc?tab=comments#one"),
    "/abc?tab=comments#one",
  );
  assert.equal(redirect.safeRedirectPath("/a/../abc"), "/abc");
});

test("new share IDs retain legacy URL compatibility", () => {
  assert.ok(input.isUploadId("a1b2c3d4"));
  assert.match(input.newUploadId(), /^[a-f0-9]{32}$/);
  assert.ok(input.isUploadId(input.newUploadId()));
  assert.equal(input.isUploadId("abc"), false);
});

test("invalid metadata is rejected rather than partially parsed", () => {
  for (const value of ["12px", "-1", "Infinity", " "]) {
    assert.throws(
      () => input.parseOptionalNumber(value, "width", true),
      input.InputError,
    );
  }
  assert.throws(
    () => input.parseOptionalNumber("1.2", "width", true),
    input.InputError,
  );
  assert.throws(() => input.parseTitle("%E0%A4%A", true), input.InputError);
  assert.throws(() => input.parseFilename("../test.png"), input.InputError);
  assert.throws(
    () => input.parseMediaType("audio", "video/mp4"),
    input.InputError,
  );
  assert.equal(input.parseTitle("%E4%B8%AD%E6%96%87", true), "中文");
  assert.equal(input.parseOptionalNumber(null, "width", true), null);
  assert.equal(input.parseOptionalNumber("123", "width", true), 123);
  assert.equal(input.parseSocialEnabled("false"), false);
});

test("browser preflight permits per-upload social settings", () => {
  const response = api.optionsResponse();
  assert.equal(response.status, 204);
  assert.match(
    response.headers.get("access-control-allow-headers"),
    /X-Social-Enabled/i,
  );
});

test("invalid upload metadata maps to HTTP 400 after authorization", async () => {
  const request = new Request("https://framecho.invalid/api/upload", {
    headers: { Authorization: "Bearer test-token" },
  });
  const response = await api.protectedApi(request, "test-token", () =>
    input.parseTitle("%bad%", true),
  );
  assert.equal(response.status, 400);
});

test("R2 writes cannot overwrite a key and are removed on D1 failure", async () => {
  const simulator = new Miniflare({
    modules: true,
    script: `${storageSource}
      export default { async fetch(request, env) {
        const key = new URL(request.url).pathname.slice(1);
        try {
          const object = await storeUpload(env.BUCKET, key, await request.text(), {}, (stored) => {
            if (request.headers.get('x-fail')) throw new Error('D1 failed');
            return Promise.resolve(stored.size);
          });
          return Response.json({ size: object.size });
        } catch (error) { return new Response(error.message, { status: 500 }); }
      } }`,
    compatibilityDate: "2026-07-17",
    r2Buckets: ["BUCKET"],
  });
  try {
    const bucket = await simulator.getR2Bucket("BUCKET");
    const upload = (key, body, fail = false) =>
      simulator.dispatchFetch(`http://local/${key}`, {
        method: "PUT",
        body,
        headers: fail ? { "x-fail": "1" } : {},
      });
    const created = await upload("new-key", "中文");
    assert.equal(created.status, 200);
    assert.deepEqual(await created.json(), { size: 6 });
    const collision = await upload("new-key", "replacement");
    assert.equal(collision.status, 500);
    assert.match(await collision.text(), /collision/);
    assert.equal(await (await bucket.get("new-key")).text(), "中文");
    const failed = await upload("failed-key", "file", true);
    assert.equal(failed.status, 500);
    assert.match(await failed.text(), /D1 failed/);
    assert.equal(await bucket.head("failed-key"), null);
  } finally {
    await simulator.dispose();
  }
});

test("cold concurrent schema upgrades preserve uploads and warm calls execute no DDL", async () => {
  const simulator = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    compatibilityDate: "2026-07-17",
    d1Databases: ["DB"],
  });
  try {
    const database = await simulator.getD1Database("DB");
    await database.exec(
      "CREATE TABLE uploads (id TEXT PRIMARY KEY, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, width INTEGER, height INTEGER, r2_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    );
    await database
      .prepare(
        "INSERT INTO uploads (id, filename, content_type, size, r2_key) VALUES ('a1b2c3d4', 'existing.png', 'image/png', 1, 'existing')",
      )
      .run();
    await Promise.all(
      Array.from({ length: 8 }, () => schema.initializeSchema(database)),
    );
    const row = await database
      .prepare(
        "SELECT filename, social_enabled FROM uploads WHERE id = 'a1b2c3d4'",
      )
      .first();
    assert.deepEqual(row, { filename: "existing.png", social_enabled: 1 });
    let queries = 0;
    const warmDatabase = {
      prepare(sql) {
        queries++;
        return database.prepare(sql);
      },
      exec() {
        throw new Error("Warm schema check must not execute DDL");
      },
    };
    assert.deepEqual(await schema.initializeSchema(warmDatabase), []);
    assert.equal(queries, 1);
  } finally {
    await simulator.dispose();
  }
});
