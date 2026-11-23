[English](README.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

# Framecho Worker

[Framecho](https://github.com/helson-lin/Screendrop) の自己ホスト型クラウド共有サービスです。helson-lin が保守しています。[Screendrop Worker](https://github.com/fayazara/screendrop-worker) を基に、そのアップロード手順を保ったまま、スクリーンショット、画面収録、ポスター、プレビュー画像に対応します。

構成は TanStack Start / React / Kumo / Video.js で、Cloudflare Workers に配置します。ファイルは R2、共有のメタデータは D1 に置きます。

このサービスが返すのは共有ページと API だけです。`/` は 404 です。共有ページのロゴは Framecho のリポジトリへリンクします。

共有ページは静かな 1 列です。タイトル、日付、メディアを元の縦横比で表示します。塗りつぶしのボタンは **ダウンロード** だけです。その隣が **Markdown をコピー** です。リンクのコピー、画像のコピー、フルスクリーン、拡大縮小（合わせる / 原寸。画像のクリックでも切り替え）は「その他」にあります。携帯電話ではリンクのコピーもそのメニューに入り、対応している場合はシステムの共有を使います。Markdown の画像は元の画像アドレスを使います。画面収録はクリックできるポスターを使い、ポスターがなければ共有リンクを使います。ページの言語はブラウザに従い、簡体字中国語、繁体字中国語、英語、ロシア語、日本語、韓国語のいずれかです。外観はシステムのライト / ダークに従います。

共有ページには、コメント、いいね、閲覧数、字幕はもう出ません。対応する API と既存のデータは残しています。画面を戻してもデータの移行は不要です。

Framecho はスクリーンショットを既定で AVIF としてアップロードし、`/api/assets/:id` で JPEG ポスターを添えます。ポスターがあるとき、`og:image` / `twitter:image` はそれを優先します。AVIF を表示できないチャットアプリでもプレビューが出ます。ポスターのない古いアップロードは、これまでどおり元の画像を使います。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helson-lin/Framecho-worker)

## 配置

1. **Framecho → 設定 → クラウド** を開き、**トークンをコピーして配置** をクリックします。Framecho はアップロードトークンをコピーし、Cloudflare の配置ページを開きます。
2. そのページがこのリポジトリをあなたの GitHub アカウントに複製します。初回は **`UPLOAD_TOKEN`** にトークンを貼り付けます（⌘V）。Cloudflare が R2 と D1 を作ります。
3. 配置された Worker の URL を Framecho に戻し、**接続を確認** をクリックします。アプリは `/api/setup` でデータベースを初期化し、`/api/ping` でトークンを確認します。

Worker の URL は共有サービスのアドレスです。例: `https://framecho-worker.<account>.workers.dev`。壁紙バケットのドメインではありません。壁紙パックと、スクリーンショットや画面収録の共有は、別の R2 バケットを使えます。

**アップロードと共有の表示に GitHub Application ID も OAuth も不要です。** OAuth はコメントといいねの API だけに使います。共有ページは今、この 2 つを出していません。

コマンドで配置する:

```bash
git clone https://github.com/helson-lin/Framecho-worker.git
cd Framecho-worker
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# .dev.vars に自分の UPLOAD_TOKEN を書く。このファイルはコミットしない。
pnpm run build
pnpm exec wrangler deploy --secrets-file .dev.vars
```

最初の CLI 配置でリソースを自動作成できます。その後、実際の Worker 名、D1 の `database_id` / `database_name`、R2 の `bucket_name` を、配置先リポジトリの `wrangler.jsonc` に保存し、以後も同じリソースを使います。このテンプレートに特定アカウントのリソース ID は入っていません。

## 配置済み Worker を更新する

ワンクリック配置で作ったリポジトリのコピーは、このリポジトリを自動では追いません。配置先リポジトリでブランチを作り、こちらの更新を取り込んで確認します。既存の Worker 名と R2 / D1 のバインドは残します。チェックが通ったら配置ブランチへマージし、Workers Builds に公開させます。

コピーとこのリポジトリに共通の履歴がない場合は、変更を一つずつ移すか、ブランチ上で履歴を合わせます。本番の設定をそのまま上書きしないでください。任意の変数とシークレットは Cloudflare に置き、リポジトリにはコミットしません。

```bash
pnpm install --frozen-lockfile
pnpm run cf-typegen
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

更新を配置したあと、Framecho で **接続を確認** をクリックします。`/api/setup` が既存のデータベースをその場で互換アップグレードします。初期化はスキーマの版を保存します。通常のリクエストはその版を見るだけで、DDL を繰り返しません。同時のアップグレードは、列の重複エラーを「すでに適用済み」として扱います。古い 8 文字の共有 ID はそのまま使えます。新しい共有は 32 文字の ID です。

稼働中のデータベースは、実行時の初期化でテーブルを作っていることがあります。**過去の `db:migrate:remote` を直接実行しないでください。** Drizzle の古いテーブル作成や列追加が、今の構造と衝突することがあります。この更新は既存のファイルを移しも削除もしません。

プルリクエストと `main` へのプッシュでは、GitHub Actions が同じテスト、型チェック、lint、ビルドを実行します（`.github/workflows/ci.yml`）。`main` へマージできるのは **Test and build** が成功したあとです。

Worker の版は `version.json` にまとまっています。`/api/version` は同じ版を返します。Framecho は、このリポジトリの `main` にある `version.json` を見て更新の有無を判断します。

## 任意の設定

| 設定 | 用途 |
| --- | --- |
| `UPLOAD_TOKEN` | 必須。アップロード、初期化、削除を認証する |
| `AUTHOR_NAME` | 共有ページに出す作者名。未設定なら出さない |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | コメントといいね API のログインに使う GitHub **OAuth App** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth のログイン |
| `AUTH_SECRET` | セッション署名用の別シークレット。既定はアップロードトークン |

`optional-vars.example` に任意の値を列挙しています。ワンクリック配置の必須シークレットには入りません。本番では `pnpm exec wrangler secret put <NAME>` で設定します。ローカルでは Git が追跡しない `.dev.vars` に追記します。

GitHub OAuth のコールバックは `https://<your-worker>/api/auth/callback/github`、Google OAuth のコールバックは `https://<your-worker>/api/auth/callback/google` です。先に配置し、そのあと提供元で資格情報を作って Worker に設定します。どちらも未設定なら、匿名のコメントやいいねの入口はありません。

## API とデータ

管理リクエストは `Authorization: Bearer <UPLOAD_TOKEN>` を使います。

| パス | メソッド | 用途 |
| --- | --- | --- |
| `/api/setup` | POST | データベースを作成または互換アップグレードする |
| `/api/ping` | GET | トークンと接続を確認する |
| `/api/version` | GET | Worker の版を読む |
| `/api/upload` | PUT / POST | ストリーミングアップロード / multipart アップロード |
| `/api/register` | POST | すでに R2 にあるメディアを登録する |
| `/api/assets/:id` | POST | ポスター、字幕、プレビュー、タイトル、章をアップロードする |
| `/api/upload/:id` | PUT / DELETE | その共有を同じリンクのまま差し替える / 共有と関連データを削除する |
| `/:id` | GET | 公開の共有ページ |

ストリーミングアップロードは `X-Filename`、`X-Media-Type`、`X-Width`、`X-Height`、`X-Duration`、`X-Title`、`X-Social-Enabled` を受け付けます。タイトルは UTF-8 のパーセントエンコードです。不正なエンコードやパラメータは 400 です。戻り値は `{ id, url, filename, size }` です。サイズは R2 が実際に書いたバイト数です。

メディアは引き続きストリームで書き込みます。新規アップロードは R2 の条件付き書き込みを使い、既存オブジェクトを上書きしません。`PUT /api/upload/:id` はその共有のファイルを差し替え、id、コメント、閲覧数を残します。D1 への書き込みが失敗したら、今回書いた新しいオブジェクトを削除しようとします。R2 と D1 は一つのトランザクションではないので、ネットワーク障害で掃除が失敗した場合は運用での対応が残ります。差し替えた共有ページはメディアのアドレスに `?v=` を付け、ブラウザがキャッシュした古いファイルを出し続けないようにします。

`BUCKET` は R2、`DB` は D1 です。共有リンクを持っている人はメディアを見てダウンロードできます。OAuth が守るのはコメントといいねだけで、メディアのアクセスは制限しません。

## ローカル開発

Node.js 22 以降が必要です。プロジェクトは pnpm 12.8.1 を固定しています。

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# 本番のトークンではなく、ローカルのテスト用トークンを書く。
pnpm run cf-typegen
pnpm run dev
```

開発サーバーは `http://localhost:3000` です。R2 と D1 はローカルのシミュレーターです。`pnpm run test` は、このプロジェクトの Wrangler に付属する Miniflare を使います。リダイレクト、アップロードパラメータ、CORS、R2 が上書きを拒むことと失敗時の掃除、既存の行を残す D1 の同時アップグレードを確認します。

## ライセンス

MIT。fayazara の Screendrop Worker に基づきます。上流の作者とライセンスはそのままです。
