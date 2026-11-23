[English](README.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

# Framecho Worker

[Framecho](https://github.com/helson-lin/Screendrop)의 자체 호스팅 클라우드 공유 서비스입니다. helson-lin이 유지합니다. [Screendrop Worker](https://github.com/fayazara/screendrop-worker)를 바탕으로 그 업로드 방식을 유지하고, 스크린샷, 화면 녹화, 포스터, 미리보기 이미지를 지원합니다.

구성은 TanStack Start / React / Kumo / Video.js이며 Cloudflare Workers에 배포합니다. 파일은 R2에, 공유 메타데이터는 D1에 둡니다.

이 서비스는 공유 페이지와 API만 제공합니다. `/` 는 404를 반환합니다. 공유 페이지의 로고는 Framecho 저장소로 연결됩니다.

공유 페이지는 한 열입니다. 제목, 날짜, 미디어를 원래 비율로 보여 줍니다. 채워진 버튼은 **다운로드**뿐입니다. 그 옆이 **Markdown 복사**입니다. 링크 복사, 이미지 복사, 전체 화면, 확대/축소(맞추기 / 실제 크기, 이미지를 눌러 전환)는 더보기 메뉴에 있습니다. 휴대폰에서는 링크 복사도 그 메뉴에 들어가고, 브라우저가 지원하면 시스템 공유를 사용합니다. Markdown의 이미지는 원본 주소를 사용합니다. 화면 녹화는 누를 수 있는 포스터를 쓰고, 포스터가 없으면 공유 링크를 사용합니다. 페이지 언어는 브라우저를 따릅니다. 간체 중국어, 번체 중국어, 영어, 러시아어, 일본어, 한국어 중 하나입니다. 겉모습은 시스템의 라이트 / 다크를 따릅니다.

공유 페이지는 댓글, 좋아요, 조회수, 자막을 더 이상 보여 주지 않습니다. 해당 API와 이미 있는 데이터는 남습니다. 화면을 되돌려도 데이터 마이그레이션은 필요 없습니다.

Framecho는 스크린샷을 기본적으로 AVIF로 올리고 `/api/assets/:id`로 JPEG 포스터를 붙입니다. 포스터가 있으면 `og:image` / `twitter:image`가 그것을 우선합니다. AVIF를 그리지 못하는 채팅 앱도 미리보기를 볼 수 있습니다. 포스터가 없는 이전 업로드는 여전히 원본 이미지를 사용합니다.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/helson-lin/Framecho-worker)

## 배포

1. **Framecho → 설정 → 클라우드**를 열고 **토큰 복사 후 배포**를 누릅니다. Framecho가 업로드 토큰을 복사하고 Cloudflare 배포 페이지를 엽니다.
2. 그 페이지가 이 저장소를 내 GitHub 계정으로 복제합니다. 처음 배포할 때는 **`UPLOAD_TOKEN`**에 토큰을 붙여 넣습니다(⌘V). Cloudflare가 R2와 D1을 만듭니다.
3. 배포된 Worker URL을 Framecho에 다시 넣고 **연결 확인**을 누릅니다. 앱은 `/api/setup`으로 데이터베이스를 초기화하고 `/api/ping`으로 토큰을 확인합니다.

Worker URL은 공유 서비스 주소입니다. 예: `https://framecho-worker.<account>.workers.dev`. 배경화면 버킷 도메인이 아닙니다. 배경화면 팩과 스크린샷·화면 녹화 공유는 서로 다른 R2 버킷을 쓸 수 있습니다.

**업로드와 공유 보기에 GitHub Application ID나 OAuth는 필요 없습니다.** OAuth는 댓글과 좋아요 API에만 씁니다. 공유 페이지는 지금 이 두 기능을 제공하지 않습니다.

명령으로 배포:

```bash
git clone https://github.com/helson-lin/Framecho-worker.git
cd Framecho-worker
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# .dev.vars에 자신의 UPLOAD_TOKEN을 넣습니다. 이 파일은 커밋하지 않습니다.
pnpm run build
pnpm exec wrangler deploy --secrets-file .dev.vars
```

첫 CLI 배포에서 리소스를 자동으로 만들 수 있습니다. 그 뒤 실제 Worker 이름, D1의 `database_id` / `database_name`, R2의 `bucket_name`을 배포 저장소의 `wrangler.jsonc`에 저장해 다음에도 같은 리소스를 묶습니다. 이 템플릿에는 특정 계정의 리소스 ID가 들어 있지 않습니다.

## 배포된 Worker 업데이트

한 번 클릭으로 만든 저장소 복사본은 이 저장소를 저절로 따라가지 않습니다. 배포 저장소에서 브랜치를 만들고, 여기의 업데이트를 가져와 검토합니다. 기존 Worker 이름과 R2 / D1 바인딩은 유지합니다. 검사가 통과하면 배포 브랜치에 병합하고 Workers Builds가 게시하게 합니다.

복사본과 이 저장소에 공통 이력이 없으면 코드를 항목별로 옮기거나 브랜치에서 이력을 맞춥니다. 프로덕션 설정을 그대로 덮어쓰지 마세요. 선택 변수와 시크릿은 Cloudflare에 두고 저장소에 커밋하지 않습니다.

```bash
pnpm install --frozen-lockfile
pnpm run cf-typegen
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

업데이트를 배포한 뒤 Framecho에서 **연결 확인**을 누릅니다. `/api/setup`이 기존 데이터베이스를 그 자리에서 호환 업그레이드합니다. 초기화는 스키마 버전을 저장합니다. 일반 요청은 그 버전만 확인하고 DDL을 다시 실행하지 않습니다. 동시에 진행되는 업그레이드는 중복 열 오류를 이미 적용된 것으로 확인합니다. 예전 8자 공유 ID는 계속 쓸 수 있습니다. 새 공유는 32자 ID를 사용합니다.

이미 운영 중인 데이터베이스는 런타임 초기화로 테이블을 만들었을 수 있습니다. **과거의 `db:migrate:remote`를 직접 실행하지 마세요.** Drizzle의 예전 테이블 생성과 열 추가가 현재 구조와 충돌할 수 있습니다. 이번 업그레이드는 기존 파일을 옮기거나 삭제하지 않습니다.

풀 리퀘스트와 `main`으로의 푸시는 GitHub Actions에서 같은 테스트, 타입 검사, lint, 빌드를 실행합니다(`.github/workflows/ci.yml`). `main`에는 **Test and build**가 통과한 뒤에만 병합할 수 있습니다.

Worker 버전은 `version.json`에 있습니다. `/api/version`은 같은 버전을 반환합니다. Framecho는 이 저장소 `main`의 `version.json`을 읽어 업데이트가 있는지 확인합니다.

## 선택 설정

| 설정 | 용도 |
| --- | --- |
| `UPLOAD_TOKEN` | 필수. 업로드, 초기화, 삭제를 인증합니다. |
| `AUTHOR_NAME` | 공유 페이지에 보이는 작성자 이름. 설정하지 않으면 숨깁니다. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | 댓글과 좋아요 API 로그인에 쓰는 GitHub **OAuth App** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 로그인 |
| `AUTH_SECRET` | 별도의 세션 서명 비밀. 기본값은 업로드 토큰입니다. |

`optional-vars.example`에 선택 값이 있습니다. 원클릭 배포의 필수 시크릿에는 들어가지 않습니다. 운영 환경에서는 `pnpm exec wrangler secret put <NAME>`으로 설정합니다. 로컬에서는 Git이 추적하지 않는 `.dev.vars`에 추가합니다.

GitHub OAuth 콜백은 `https://<your-worker>/api/auth/callback/github`, Google OAuth 콜백은 `https://<your-worker>/api/auth/callback/google`입니다. 먼저 배포한 다음 제공자에서 자격 증명을 만들어 Worker에 넣습니다. 둘 다 없으면 익명 댓글이나 좋아요 입구가 없습니다.

## API와 데이터

관리 요청은 `Authorization: Bearer <UPLOAD_TOKEN>`을 사용합니다.

| 경로 | 메서드 | 용도 |
| --- | --- | --- |
| `/api/setup` | POST | 데이터베이스를 만들거나 호환 업그레이드 |
| `/api/ping` | GET | 토큰과 연결 확인 |
| `/api/version` | GET | Worker 버전 조회 |
| `/api/upload` | PUT / POST | 스트리밍 업로드 / multipart 업로드 |
| `/api/register` | POST | 이미 R2에 있는 미디어 등록 |
| `/api/assets/:id` | POST | 포스터, 자막, 미리보기, 제목, 장 업로드 |
| `/api/upload/:id` | PUT / DELETE | 그 공유를 링크는 그대로 교체 / 공유와 관련 데이터 삭제 |
| `/:id` | GET | 공개 공유 페이지 |

스트리밍 업로드는 `X-Filename`, `X-Media-Type`, `X-Width`, `X-Height`, `X-Duration`, `X-Title`, `X-Social-Enabled`를 받습니다. 제목은 UTF-8 퍼센트 인코딩입니다. 잘못된 인코딩이나 매개변수는 400입니다. 응답은 `{ id, url, filename, size }`입니다. 크기는 R2가 실제로 기록한 바이트 수입니다.

미디어는 계속 스트림으로 씁니다. 새 업로드는 R2 조건부 쓰기를 사용해 기존 객체를 덮어쓰지 않습니다. `PUT /api/upload/:id`는 그 공유의 파일을 바꾸고 id, 댓글, 조회수를 유지합니다. D1 쓰기가 실패하면 이번에 쓴 새 객체를 지우려고 합니다. R2와 D1은 하나의 트랜잭션이 아니므로, 네트워크 오류로 정리에 실패하면 운영에서 처리해야 합니다. 교체된 공유 페이지는 미디어 주소에 `?v=`를 붙여 브라우저가 캐시된 이전 파일을 계속 보여 주지 않게 합니다.

`BUCKET`은 R2, `DB`는 D1입니다. 공유 링크를 가진 사람은 미디어를 보고 다운로드할 수 있습니다. OAuth는 댓글과 좋아요만 보호하고 미디어 접근은 제한하지 않습니다.

## 로컬 개발

Node.js 22 이상이 필요합니다. 프로젝트는 pnpm 12.8.1을 고정합니다.

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# 운영 토큰이 아닌 로컬 테스트 토큰을 넣습니다.
pnpm run cf-typegen
pnpm run dev
```

개발 주소는 `http://localhost:3000`입니다. R2와 D1은 로컬 시뮬레이터입니다. `pnpm run test`는 이 프로젝트 Wrangler에 포함된 Miniflare를 사용합니다. 리디렉션, 업로드 매개변수, CORS, R2의 덮어쓰기 거부와 실패 후 정리, 기존 행을 유지하는 D1 동시 업그레이드를 확인합니다.

## 라이선스

MIT. fayazara의 Screendrop Worker를 기반으로 합니다. 원 저작자와 라이선스는 그대로입니다.
