[English](README.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

# Framecho Worker

Self-hosted cloud sharing for [Framecho](https://github.com/helson-lin/Screendrop), maintained by helson-lin. Based on [Screendrop Worker](https://github.com/fayazara/screendrop-worker). It keeps that upload protocol and adds screenshots, recordings, posters, and preview images.

Stack: TanStack Start / React / Kumo / Video.js, deployed on Cloudflare Workers. R2 stores files. D1 stores share metadata.

The service only serves share pages and the API. `/` returns 404. The logo on a share page links to the Framecho repository.

A share page is one quiet column: title, date, and the media at its own aspect ratio. **Download** is the only filled button. **Copy Markdown** sits beside it. Copy link, copy image, full screen, and zoom (fit / actual size, or click the image) live in the More menu. On a phone, copy link is in that menu too, and uses the system share sheet when the browser supports it. Copy Markdown uses the original image address. A recording uses a clickable poster, or the share link when it has no poster. The page follows the browser language — Simplified Chinese, Traditional Chinese, English, Russian, Japanese, or Korean — and the system light or dark appearance.

The share page no longer shows comments, likes, view counts, or captions. Those APIs and any existing data remain (comment and like endpoints, captions, preview images, and view events). Restoring the interface does not require a data migration.

Framecho uploads screenshots as AVIF and attaches a JPEG poster through `/api/assets/:id`. When a poster exists, `og:image` / `twitter:image` use it, so chat apps that cannot render AVIF still show a preview. Older clients that uploaded without a poster still use the original image.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helson-lin/Framecho-worker)

## Deploy

1. Open **Framecho → Settings → Cloud** and click **Copy Token and Deploy**. Framecho copies the upload token and opens the Cloudflare deploy page.
2. That page clones this repository into your GitHub account. For the first deploy, paste the token into **`UPLOAD_TOKEN`** (⌘V). Cloudflare creates R2 and D1.
3. Paste the deployed Worker URL back into Framecho and click **Verify Connection**. The app calls `/api/setup` to initialize the database, then `/api/ping` to check the token.

The Worker URL is the share service, for example `https://framecho-worker.<account>.workers.dev`. It is not the wallpaper bucket's domain. Wallpaper packs and screenshot or recording shares can use different R2 buckets.

**Uploading and viewing a share does not need a GitHub Application ID or OAuth.** OAuth is only for the comment and like APIs. The share page does not offer those two features today.

Deploy from the command line:

```bash
git clone https://github.com/helson-lin/Framecho-worker.git
cd Framecho-worker
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# Put your own UPLOAD_TOKEN in .dev.vars. This file is not committed.
pnpm run build
pnpm exec wrangler deploy --secrets-file .dev.vars
```

The first CLI deploy can create the resources. After that, save the real Worker name and the D1 `database_id` / `database_name` and R2 `bucket_name` into the deployed repository's `wrangler.jsonc`, so later deploys keep the same resources. This template does not ship anyone's resource IDs.

## Updating your worker

A repository created by one-click deploy does not follow this repository by itself. In the deployed repository, open a branch, pull the updates from this repository, and review them. Keep the existing Worker name and the R2 / D1 bindings. After the checks pass, merge into the deploy branch and let Workers Builds publish it.

If the copy and this repository do not share history, move the code change by change, or reconcile the histories on a branch. Do not overwrite the production configuration. Optional variables and secrets stay in Cloudflare and must not be committed.

```bash
pnpm install --frozen-lockfile
pnpm run cf-typegen
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

After the update is deployed, click **Verify Connection** in Framecho. `/api/setup` upgrades an existing database in place. Initialization stores a schema version. An ordinary request only checks that version and does not run DDL again. Concurrent upgrades treat a duplicate-column error as already applied. Old 8-character share IDs still work. New shares use 32-character IDs.

A live database may already have tables created by runtime initialization. **Do not run the historical `db:migrate:remote` directly.** Drizzle's old create-table and add-column steps can collide with that schema. This upgrade does not move or delete existing files.

Pull requests and pushes to `main` run the same test, typecheck, lint, and build in GitHub Actions (`.github/workflows/ci.yml`). `main` can be merged only after **Test and build** passes.

The Worker version lives in `version.json`. `/api/version` returns that same version. Framecho reads `version.json` on this repository's `main` to see whether an update is available.

## Optional configuration

| Setting | Purpose |
| --- | --- |
| `UPLOAD_TOKEN` | Required. Authorizes upload, setup, and delete. |
| `AUTHOR_NAME` | Name shown on the share page. Hidden when unset. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub **OAuth App** for the comment and like APIs. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth sign-in. |
| `AUTH_SECRET` | Separate session-signing secret. Defaults to the upload token. |

`optional-vars.example` lists the optional values. They are not required secrets in one-click deploy. In production, set them with `pnpm exec wrangler secret put <NAME>`. Locally, append them to `.dev.vars`, which Git does not track.

The GitHub OAuth callback is `https://<your-worker>/api/auth/callback/github`. The Google OAuth callback is `https://<your-worker>/api/auth/callback/google`. Deploy first, then create the credentials and put them on the Worker. With neither configured, there is no anonymous comment or like entry.

## API and data

Management requests use `Authorization: Bearer <UPLOAD_TOKEN>`.

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/setup` | POST | Create or upgrade the database |
| `/api/ping` | GET | Check the token and the connection |
| `/api/version` | GET | Read the Worker version |
| `/api/upload` | PUT / POST | Streaming upload / multipart upload |
| `/api/register` | POST | Register media already stored in R2 |
| `/api/assets/:id` | POST | Upload a poster, captions, preview, title, or chapters |
| `/api/upload/:id` | PUT / DELETE | Replace that share in place (the link stays) / delete the share and its data |
| `/:id` | GET | Public share page |

A streaming upload accepts `X-Filename`, `X-Media-Type`, `X-Width`, `X-Height`, `X-Duration`, `X-Title`, and `X-Social-Enabled`. The title is percent-encoded UTF-8. Invalid encoding or parameters return 400. The response is `{ id, url, filename, size }`. Size is the number of bytes R2 stored.

Media is still streamed. A new upload uses a conditional R2 write so it cannot overwrite an existing object. `PUT /api/upload/:id` replaces that share's file and keeps the id, comments, and view count. If the D1 write fails, the new object is deleted. R2 and D1 are not one transaction, so a cleanup that fails on the network still needs an operator. A replaced share page adds `?v=` to the media address so the browser does not keep showing a cached copy.

`BUCKET` is R2. `DB` is D1. Anyone with the share link can view and download the media. OAuth only protects comments and likes.

## Local development

Node.js 22 or newer. The project pins pnpm 12.8.1.

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# Use a local test token, not the production token.
pnpm run cf-typegen
pnpm run dev
```

The dev server is `http://localhost:3000`. R2 and D1 are local simulators. `pnpm run test` uses the Miniflare that ships with this project's Wrangler. It covers redirect checks, upload parameters, CORS, R2's refusal to overwrite and its failure cleanup, and concurrent D1 upgrades that keep existing rows.

## License

MIT. Based on fayazara's Screendrop Worker. The upstream author and license stay as they are.
