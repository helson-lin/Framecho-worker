[English](README.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

# Framecho Worker

[Framecho](https://github.com/helson-lin/Screendrop) 的自架雲端分享服務，由 helson-lin 獨立維護。基於 [Screendrop Worker](https://github.com/fayazara/screendrop-worker)，保留其上傳協定，支援螢幕截圖、螢幕錄影、封面與預覽圖。

技術棧：TanStack Start / React / Kumo / Video.js，部署於 Cloudflare Workers；R2 存放檔案，D1 存放分享中繼資料。

服務只提供分享頁面與 API，根位址 `/` 回傳 404；分享頁 Logo 連結到 Framecho 專案儲存庫。

分享頁是簡潔的單欄版面：標題、日期與媒體資訊，媒體按原始比例顯示。**下載**是唯一的填色按鈕，**複製 Markdown** 緊接其後。複製連結、複製圖片、全螢幕與縮放（配合 / 原始尺寸，也可直接點一下圖片切換）放在更多選單中；手機上複製連結也收進選單，並在支援時呼叫系統分享。複製 Markdown 時圖片使用原圖位址，錄影使用可點選的封面（沒有封面時使用分享連結）。頁面依瀏覽器語言顯示簡體中文、繁體中文、英文、俄文、日文或韓文，並跟隨系統的淺色 / 深色外觀。

分享頁不再顯示留言、喜歡、瀏覽次數與字幕。對應的 API 與既有資料仍然保留（留言與喜歡介面、字幕與預覽圖資源，瀏覽統計照常記錄），恢復介面不需要遷移資料。

Framecho 預設將螢幕截圖以 AVIF 上傳，並透過 `/api/assets/:id` 附上一張 JPEG 封面。分享連結的 `og:image` / `twitter:image` 有封面時優先使用封面，讓不支援 AVIF 的聊天應用程式也能顯示連結預覽；舊版用戶端上傳的截圖沒有封面，仍使用原圖。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helson-lin/Framecho-worker)

## 部署

1. 打開 **Framecho → 設定 → 雲端**，點按 **拷貝權杖並部署**。Framecho 把上傳權杖拷貝到剪貼簿，並打開 Cloudflare 部署頁。
2. 部署頁將本儲存庫複製到你的 GitHub 帳號。首次部署只需在 **`UPLOAD_TOKEN`** 中貼上權杖（⌘V）；Cloudflare 自動建立 R2 與 D1。
3. 將部署後的 Worker URL 填回 Framecho，然後點按 **驗證連線**。用戶端會呼叫 `/api/setup` 初始化資料庫，再呼叫 `/api/ping` 驗證權杖。

Worker URL 是分享服務位址，例如 `https://framecho-worker.<account>.workers.dev`，不是桌布下載貯體的網域。桌布包與螢幕截圖或螢幕錄影分享可以使用不同的 R2 貯體。

**上傳和查看分享不需要 GitHub Application ID，也不需要 OAuth。** OAuth 只用於留言與喜歡 API，分享頁目前不提供這兩項功能。

手動部署：

```bash
git clone https://github.com/helson-lin/Framecho-worker.git
cd Framecho-worker
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# 在 .dev.vars 填入你自己的 UPLOAD_TOKEN；此檔案不會提交到 Git。
pnpm run build
pnpm exec wrangler deploy --secrets-file .dev.vars
```

首次 CLI 部署可自動建立資源。部署後應將實際 Worker 名稱、D1 的 `database_id` / `database_name` 與 R2 的 `bucket_name` 儲存到部署儲存庫的 `wrangler.jsonc`，以後繼續綁定同一組資源。此範本沒有預填某個帳號的資源 ID。

## 更新已部署的 Worker

一鍵部署建立的儲存庫複本不會自動跟隨本儲存庫更新。在部署儲存庫新建分支，拉取本儲存庫的更新並審閱；保留現有 Worker 名稱與 R2 / D1 資源綁定，測試通過後合併到部署分支，由 Workers Builds 發布。

如果儲存庫複本與本儲存庫沒有共同歷史，請逐項遷移程式碼或在分支上處理歷史合併，不要直接覆蓋生產設定。選用變數與 secret 留在 Cloudflare，不應提交到儲存庫。

```bash
pnpm install --frozen-lockfile
pnpm run cf-typegen
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

更新部署後，在 Framecho 點按 **驗證連線**，由 `/api/setup` 相容升級既有資料庫。初始化使用持久化 schema 版本，一般請求只檢查版本，不重複執行 DDL；並行升級會核對重複欄位錯誤。舊的 8 位分享 ID 仍然可用，新分享使用 32 位 ID。

既有線上資料庫可能已透過執行階段初始化建立資料表，**不要直接執行歷史的 `db:migrate:remote`**，否則 Drizzle 的歷史建表／加欄操作可能與現有結構衝突。此次升級不會遷移或刪除既有檔案。

拉取請求與推送到 `main` 時，GitHub Actions 會執行同樣的測試、型別檢查、lint 與建置（`.github/workflows/ci.yml`）；`main` 要求 **Test and build** 通過後才能合併。

Worker 版本統一來自 `version.json`；`/api/version` 回傳同一版本。Framecho 從本儲存庫 `main` 上的 `version.json` 檢查可用更新。

## 選用設定

| 設定 | 用途 |
| --- | --- |
| `UPLOAD_TOKEN` | 必填：認證上傳、初始化與刪除等管理操作 |
| `AUTHOR_NAME` | 分享頁顯示的作者名稱；未設定時不顯示 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub **OAuth App**，用於留言與喜歡 API 的登入 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 登入 |
| `AUTH_SECRET` | 獨立的工作階段簽章密鑰；預設使用上傳權杖 |

`optional-vars.example` 列出選用值，不參與一鍵部署的必填 secret 提示。線上使用 `pnpm exec wrangler secret put <NAME>` 設定；本機追加到不被 Git 追蹤的 `.dev.vars`。

GitHub OAuth App 的回呼為 `https://<your-worker>/api/auth/callback/github`；Google OAuth 的回呼為 `https://<your-worker>/api/auth/callback/google`。先部署，再在提供方建立憑證並設定到 Worker。兩者都未設定時沒有匿名留言或匿名喜歡入口。

## API 與資料

上傳等管理請求使用 `Authorization: Bearer <UPLOAD_TOKEN>`。

| 路徑 | 方法 | 用途 |
| --- | --- | --- |
| `/api/setup` | POST | 建立或相容升級資料庫 |
| `/api/ping` | GET | 驗證權杖與連線 |
| `/api/version` | GET | 查詢 Worker 版本 |
| `/api/upload` | PUT / POST | 串流上傳 / multipart 上傳 |
| `/api/register` | POST | 登錄已存入 R2 的媒體 |
| `/api/assets/:id` | POST | 上傳封面、字幕、預覽圖、標題、章節 |
| `/api/upload/:id` | PUT / DELETE | 用新檔案替換該分享（連結不變）/ 刪除分享及相關資料 |
| `/:id` | GET | 公開分享頁 |

串流上傳支援 `X-Filename`、`X-Media-Type`、`X-Width`、`X-Height`、`X-Duration`、`X-Title` 與 `X-Social-Enabled`。標題使用 UTF-8 百分號編碼；非法編碼與參數回傳 400。回傳 `{ id, url, filename, size }`，大小取自 R2 實際寫入結果。

媒體繼續採用串流寫入。新建上傳用 R2 條件寫入防止覆蓋既有物件；`PUT /api/upload/:id` 則覆蓋該分享的檔案並保留 id、留言與瀏覽次數。D1 寫入失敗會嘗試刪掉這次新寫入的物件。R2 與 D1 沒有跨服務交易，網路異常造成的清理失敗仍需維運處理。替換後的分享頁在媒體位址上加 `?v=`，避免瀏覽器繼續顯示快取的舊檔案。

`BUCKET` 綁定 R2，`DB` 綁定 D1。持有分享連結的人可查看與下載媒體；OAuth 只保護留言與喜歡，不限制媒體存取。

## 本機開發

需要 Node.js 22 或更新版本；專案固定使用 pnpm 12.8.1。

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# 填入本機測試權杖，不要使用線上權杖。
pnpm run cf-typegen
pnpm run dev
```

開發位址是 `http://localhost:3000`，R2 / D1 使用本機模擬資源。`pnpm run test` 使用專案 Wrangler 配套的 Miniflare，涵蓋重新導向檢查、上傳參數、CORS、R2 防覆蓋與失敗清理、D1 並行升級與歷史資料保留。

## 授權

MIT。基於 fayazara 的 Screendrop Worker；上游作者與授權保持不變。
