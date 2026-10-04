# Framecho Worker

[Framecho](https://github.com/helson-lin/Screendrop) 的自托管云端分享服务，由 helson-lin 独立维护。基于 [Screendrop Worker](https://github.com/fayazara/screendrop-worker)，保留其上传协议，支持截图、录屏、封面和预览图。

技术栈：TanStack Start / React / Kumo / Video.js，部署于 Cloudflare Workers；R2 存文件，D1 存分享元数据。

服务只提供分享页面和 API，根地址 `/` 返回 404；分享页 Logo 链接到 Framecho 项目仓库。

分享页是简约的单栏布局：标题、日期和媒体信息，媒体按原始比例显示。**下载**是唯一的填充按钮，**复制 Markdown** 紧挨其后，复制链接、复制图片、全屏和缩放（适配 / 原尺寸，也可直接点击图片切换）在更多菜单中；手机上复制链接也收进菜单，并在支持时调用系统分享。复制 Markdown 时图片使用原图地址，录屏使用可点击的封面（没有封面时使用分享链接）。页面按浏览器语言显示中文或英文，并跟随系统的浅色 / 深色外观。

分享页不再显示评论、点赞、浏览数和字幕。对应的 API 和已有数据仍然保留（评论、点赞接口，字幕和预览图资源，浏览统计照常记录），恢复界面不需要迁移数据。

Framecho 默认将截图以 AVIF 上传，并通过 `/api/assets/:id` 附带一张 JPEG 封面。分享链接的 `og:image` / `twitter:image` 有封面时优先使用封面，让不支持 AVIF 的聊天应用也能显示链接预览；旧版客户端上传的截图没有封面，仍使用原图。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helson-lin/Framecho-worker)

## 部署

1. 打开 **Framecho → 设置 → 云端**，复制上传令牌。
2. 点击部署按钮，将本仓库克隆到你的 GitHub 账号。首次部署只需填写 **`UPLOAD_TOKEN`**；Cloudflare 自动创建 R2 和 D1。
3. 将部署后的 Worker URL 填回 Framecho，然后点击 **验证连接**。客户端会调用 `/api/setup` 初始化数据库，再调用 `/api/ping` 验证令牌。

Worker URL 是分享服务地址，例如 `https://framecho-worker.<account>.workers.dev`，不是壁纸下载桶的域名。壁纸包和截图/录屏分享可以使用不同的 R2 桶。

**上传和查看分享不需要 GitHub Application ID，也不需要 OAuth。** OAuth 只用于评论和点赞 API，分享页目前不提供这两项功能。

手动部署：

```bash
git clone https://github.com/helson-lin/Framecho-worker.git
cd Framecho-worker
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# 在 .dev.vars 填入你自己的 UPLOAD_TOKEN；此文件不会提交到 Git。
pnpm run build
pnpm exec wrangler deploy --secrets-file .dev.vars
```

首次 CLI 部署可自动创建资源。部署后应将实际 Worker 名、D1 的 `database_id` / `database_name` 和 R2 的 `bucket_name` 保存到部署仓库的 `wrangler.jsonc`，以后继续绑定同一组资源。此模板没有预填某个账号的资源 ID。

## Updating your worker

一键部署创建的仓库副本不会自动跟随本仓库更新。在部署仓库新建分支，拉取本仓库的更新并审核；保留现有 Worker 名和 R2 / D1 资源绑定，测试通过后合并到部署分支，由 Workers Builds 发布。

如果仓库副本与本仓库没有共同历史，请逐项迁移代码或在分支上处理历史合并，不要直接覆盖生产配置。可选变量和 secret 留在 Cloudflare，不应提交到仓库。

```bash
pnpm install --frozen-lockfile
pnpm run cf-typegen
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

更新部署后，在 Framecho 点击 **验证连接**，由 `/api/setup` 兼容升级已有数据库。初始化使用持久化 schema 版本，正常请求只检查版本，不重复执行 DDL；并发升级会核实重复列错误。旧的 8 位分享 ID 仍然可用，新分享使用 32 位 ID。

已有线上数据库可能通过运行时初始化创建过表，**不要直接运行历史 `db:migrate:remote`**，否则 Drizzle 的历史建表/加列操作可能与现有结构冲突。此次升级不会迁移或删除已有文件。

拉取请求和推送到 `main` 时，GitHub Actions 会运行同样的测试、类型检查、lint 和构建（`.github/workflows/ci.yml`）；`main` 要求 **Test and build** 通过后才能合并。

Worker 版本统一来自 `version.json`；`/api/version` 返回同一版本。Framecho 从本仓库 `main` 上的 `version.json` 检查可用更新。

## 可选配置

| 配置 | 用途 |
| --- | --- |
| `UPLOAD_TOKEN` | 必填：认证上传、初始化和删除等管理操作 |
| `AUTHOR_NAME` | 分享页显示的作者名；不配置时不显示 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub **OAuth App**，用于评论和点赞 API 的登录 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 登录 |
| `AUTH_SECRET` | 独立会话签名密钥；默认使用上传令牌 |

`optional-vars.example` 列出可选值，不参与一键部署的必填 secret 提示。线上使用 `pnpm exec wrangler secret put <NAME>` 配置；本地追加到不被 Git 跟踪的 `.dev.vars`。

GitHub OAuth App 的回调为 `https://<your-worker>/api/auth/callback/github`；Google OAuth 的回调为 `https://<your-worker>/api/auth/callback/google`。先部署，再在提供方创建凭据并配置到 Worker。两者都未配置时没有匿名评论或匿名点赞入口。

## API 与数据

上传等管理请求使用 `Authorization: Bearer <UPLOAD_TOKEN>`。

| 路径 | 方法 | 用途 |
| --- | --- | --- |
| `/api/setup` | POST | 创建或兼容升级数据库 |
| `/api/ping` | GET | 验证令牌与连接 |
| `/api/version` | GET | 查询 Worker 版本 |
| `/api/upload` | PUT / POST | 流式上传 / multipart 上传 |
| `/api/register` | POST | 注册已存入 R2 的媒体 |
| `/api/assets/:id` | POST | 上传封面、字幕、预览图、标题、章节 |
| `/api/upload/:id` | DELETE | 删除分享及相关数据 |
| `/:id` | GET | 公开分享页 |

流式上传支持 `X-Filename`、`X-Media-Type`、`X-Width`、`X-Height`、`X-Duration`、`X-Title` 和 `X-Social-Enabled`。标题使用 UTF-8 百分号编码；非法编码和参数返回 400。返回 `{ id, url, filename, size }`，大小取自 R2 实际写入结果。

媒体继续采用流式写入。R2 条件写入防止覆盖已有对象；D1 注册失败会尝试删除本次新写入的对象并记录清理失败。R2 与 D1 没有跨服务事务，网络异常造成的清理失败仍需运维处理。

`BUCKET` 绑定 R2，`DB` 绑定 D1。持有分享链接的人可查看和下载媒体；OAuth 只保护评论和点赞，不限制媒体访问。

## 本地开发

需要 Node.js 22 或更新版本；项目固定使用 pnpm 12.8.1。

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# 填入本地测试令牌，不使用线上令牌。
pnpm run cf-typegen
pnpm run dev
```

开发地址是 `http://localhost:3000`，R2 / D1 使用本地模拟资源。`pnpm run test` 使用项目 Wrangler 配套的 Miniflare，覆盖跳转校验、上传参数、CORS、R2 防覆盖和失败清理、D1 并发升级与历史数据保留。

## License

MIT。基于 fayazara 的 Screendrop Worker；上游作者和许可保持不变。
