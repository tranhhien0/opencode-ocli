# Checklist nghiệm thu — CLI `ocx` (OpenCode Companion CLI)

> Dùng file này để tự chấm / review PR / làm tiêu chí "Definition of Done". Mỗi mục có 3 cột ngầm: **có làm không (☐/☑)**, **có test cover không**, **có đối chiếu docs mới nhất không**.

---

## A. Checklist theo tài liệu nghiên cứu (mục 1 của prompt)

- [ ] Đã fetch và ghi chú ngày truy cập cho: `/docs/cli/`, `/docs/config/`, `/docs/providers/`, `/docs/models/`, `/docs/mcp-servers/`, `/docs/skills/`, `/docs/plugins/`, `/docs/permissions/`, `/docs/agents/`, `/docs/server/`, `/docs/sdk/`
- [ ] Có bảng "nguồn nào là chính thức (opencode.ai) vs nguồn cộng đồng/mirror (open-code.ai, DeepWiki, blog)" — không lấy mirror làm nguồn duy nhất cho hành vi quan trọng (vd. thứ tự ưu tiên credential).
- [ ] Với mọi chỗ "suy luận" (không có trong docs chính thức), có đánh dấu rõ `[GIẢ ĐỊNH – cần xác nhận]` thay vì viết như sự thật.
- [ ] Đã đối chiếu số version OpenCode CLI tại thời điểm code (`opencode --version`) với version docs mô tả — ghi rõ trong README.
- [ ] Đã đọc trang "1.0 Migration / Breaking changes" và liệt kê field nào trong config có thể đổi.

**Test tương ứng:** không phải test code, mà là *review checklist* — 1 người khác đọc lại README/docs-notes và xác nhận link còn sống, thông tin khớp bản `opencode --version` đang cài.

---

## B. Checklist chức năng — theo từng nhóm lệnh (mục 2 của prompt)

### B1. Provider & Auth
- [ ] `ocx provider list` — phân biệt rõ 3 trạng thái: đã auth (trong `auth.json`), có trong models.dev nhưng chưa auth, bị disable qua `disabled_providers`.
- [ ] `ocx provider add` (interactive) — chạy được cho cả 4 loại: oauth, api-key, openai-compatible, local (Ollama).
- [ ] `ocx provider add --non-interactive --id --type --api-key --base-url --models` — chạy trong CI/script, không hỏi gì thêm, exit code đúng khi thiếu field bắt buộc.
- [ ] `ocx provider remove/logout <id>` — xoá đúng entry trong `auth.json`, không đụng các provider khác.
- [ ] `ocx provider verify <id>` — trả về 3 loại lỗi phân biệt được: 401 (sai key), 404 (sai model ID), network/DNS (sai baseURL) — message khác nhau rõ ràng cho từng loại.
- [ ] `ocx auth login/list/logout` (wrap trực tiếp lệnh gốc) hoạt động đúng khi không cần logic thêm.

### B2. Model
- [ ] `ocx models [provider] [--refresh] [--verbose]` — output khớp format `provider/model` như CLI gốc.
- [ ] `ocx model set <provider>/<model> [--project|--global]` — validate model tồn tại (gọi `opencode models <provider>` trước khi ghi) rồi mới ghi vào đúng key config.
- [ ] `ocx model switch` — interactive picker, hiển thị được cả model variant/reasoning effort nếu provider hỗ trợ.

### B3. Plugin
- [ ] `ocx plugin add <module> [--global] [--force]` — wrap đúng `opencode plugin <module>`.
- [ ] `ocx plugin list` — đọc từ config, không gọi lại network nếu không cần.
- [ ] `ocx plugin remove <module>` — xoá đúng entry khỏi config, backup trước khi ghi.

### B4. Agent Skills
- [ ] `ocx skill list` — gộp đúng nguồn: global + project `.opencode/skills` + `.claude/skills` (trừ khi bị `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`).
- [ ] `ocx skill enable/disable <name>` — không phá cấu trúc thư mục skill gốc.

### B5. MCP servers
- [ ] `ocx mcp add/list/auth/logout/debug` — wrap đúng sub-command gốc, hỗ trợ cả local và remote server.
- [ ] `ocx mcp auth list` phân biệt server nào hỗ trợ OAuth, server nào không cần.

### B6. Session
- [ ] `ocx session export [id] [--sanitize] [--out <path>]` — xuất đúng JSON, `--sanitize` thực sự redact dữ liệu nhạy cảm (kiểm tra bằng cách grep file output không còn path tuyệt đối / secret).
- [ ] `ocx session import <file|url>` — chạy được cả với file local và share URL (`https://opncd.ai/s/...`).
- [ ] `ocx session list/delete/stats` — flag `--max-count`, `--days`, `--project` hoạt động đúng, output `--json` parse được bằng `JSON.parse` không lỗi.
- [ ] Có lệnh backup **toàn bộ** session (loop qua `session list` rồi export từng cái) — không có trong CLI gốc nên đây là giá trị cộng thêm thật sự.

### B7. Config bootstrap
- [ ] `ocx config init` — không ghi đè nếu `opencode.json` đã tồn tại (phải có `--force` mới ghi đè), giá trị mặc định sinh ra là JSON hợp lệ theo `$schema`.
- [ ] `ocx config validate` — báo đúng key lạ / sai kiểu dữ liệu, exit code khác 0 khi invalid.

### B8. Server/daemon (ưu tiên thấp)
- [ ] `ocx serve/web/attach` — wrap với default port/hostname hợp lý, đọc `OPENCODE_SERVER_PASSWORD`/`OPENCODE_SERVER_USERNAME` đúng như docs.

**Test tương ứng cho toàn bộ mục B:** mỗi sub-command có ít nhất 1 integration test dùng `opencode` binary thật (hoặc mock spawn) + 1 test "câu lệnh sai input" để chắc chắn validate hoạt động.

---

## C. Checklist đúng kỹ thuật (mục 3 của prompt)

- [ ] Chạy được trực tiếp bằng `node --experimental-strip-types` hoặc `tsx` trên Node 24, không cần build step bắt buộc.
- [ ] Có script build production tuỳ chọn (`tsc` hoặc `tsup`) — không bắt buộc nhưng phải hoạt động nếu chạy.
- [ ] **Thứ tự ưu tiên flag > env > config file > default** được implement tập trung ở đúng 1 nơi (`lib/env.ts`) — không có chỗ nào trong code tự ý đọc `process.env` trực tiếp mà bỏ qua thứ tự này.
- [ ] Mọi field config đều có default hard-code — chạy `ocx <any-command>` không truyền gì cũng không bao giờ throw do `undefined`.
- [ ] Namespace env riêng `OCX_*` không đụng độ với biến gốc OpenCode; đồng thời code có đọc lại đúng các biến gốc liên quan (`OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENCODE_SERVER_PASSWORD`, `OPENCODE_SERVER_USERNAME`...) khi cần.
- [ ] Mọi lệnh spawn `opencode` binary có try/catch, phân loại lỗi (binary not found / non-zero exit / timeout), exit code CLI tương ứng, không bao giờ để process con "treo" mà không có timeout.
- [ ] Mọi lệnh ghi file JSON: (1) backup file cũ thành `.bak` trước, (2) ghi ra file tạm rồi `rename` (atomic write) — có test giả lập crash giữa chừng để đảm bảo không mất file gốc.
- [ ] Input được validate trước khi dùng: provider ID theo đúng pattern, path tồn tại bằng `fs.access`, JSON parse thử trước khi ghi đè.
- [ ] `--dry-run` có ở tất cả lệnh có side-effect (ghi config, xoá, cài plugin) — chạy dry-run không tạo ra bất kỳ thay đổi file nào (test bằng cách so sánh hash thư mục trước/sau).
- [ ] `--verbose/--debug` in ra đúng câu lệnh `opencode ...` thực sự được gọi (để người dùng copy chạy tay được).
- [ ] Output hỗ trợ `--json` cho toàn bộ lệnh list/status (không chỉ vài lệnh) — JSON output không lẫn log/text khác (tách stdout data vs stderr log).
- [ ] Cấu trúc module đúng như yêu cầu: `commands/`, `lib/config.ts`, `lib/opencode-shell.ts`, `lib/env.ts` — không có logic đọc/ghi config nằm rải rác ngoài `lib/config.ts`.
- [ ] Không có API key/secret mẫu hard-code ở bất kỳ đâu trong code, test, hay doc (chỉ placeholder kiểu `sk-xxxx-your-key-here`).

**Test tương ứng:**
- Unit test cho `lib/env.ts`: 4 trường hợp (chỉ flag, chỉ env, chỉ config, không gì cả → default) × vài field mẫu.
- Unit test cho `lib/config.ts`: merge đúng thứ tự, atomic write không làm mất data khi mock lỗi giữa chừng.
- Snapshot test cho `--dry-run`: đảm bảo filesystem không đổi.

---

## D. Checklist đào sâu Provider (mục 4 của prompt)

- [ ] Phân loại đúng 4 nhóm provider trong tài liệu người dùng: OAuth (`/connect`), API key chuẩn, OpenAI-compatible tuỳ chỉnh, Local (Ollama).
- [ ] Sub-command tạo nhanh custom OpenAI-compatible provider ghi đúng cấu trúc:
  ```json
  {
    "provider": {
      "<id>": {
        "npm": "@ai-sdk/openai-compatible",
        "options": { "baseURL": "..." },
        "models": { "<model-id>": {} }
      }
    }
  }
  ```
  và model ID được ghi **y hệt** input người dùng, không tự transform/lowercase.
- [ ] `provider verify <id>` gọi thử đúng 1 model nhỏ, không tốn quota lớn, timeout hợp lý (vd. 10–15s).
- [ ] `model set` có bước validate model tồn tại trong `opencode models <provider>` (kể cả provider custom) trước khi ghi — nếu không tồn tại, báo lỗi rõ, không ghi liều.
- [ ] Thứ tự ưu tiên credential được ghi chú rõ nguồn (env var → `options.apiKey` trong config → `auth.json`) và CLI **không tự ý ghi đè** một nguồn ưu tiên cao hơn khi người dùng chỉ định ở nguồn thấp hơn (vd. không ghi vào `auth.json` nếu người dùng chỉ muốn set qua config).
- [ ] Có cảnh báo khi người dùng thêm provider mà tên trùng với provider đã preload — tránh xung đột `disabled_providers`/`enabled_providers`.
- [ ] Ollama/local provider: có gợi ý/flag riêng để set `num_ctx` khi tool-calling không hoạt động.

**Test tương ứng:** integration test dùng provider giả lập (mock HTTP server trả 401/404/200) để test `verify` phân loại lỗi đúng; test ghi config cho từng loại 4 provider, assert JSON output khớp schema.

---

## E. Test list tổng hợp (theo tầng)

| Tầng | Loại test | Nội dung |
|---|---|---|
| Unit | `lib/env.ts` | resolve flag/env/config/default đúng thứ tự, mọi field có default |
| Unit | `lib/config.ts` | merge config, atomic write, backup `.bak`, JSON invalid → lỗi rõ |
| Unit | `lib/opencode-shell.ts` | spawn mock: exit code 0/khác 0, binary not found, timeout |
| Integration | `provider add/verify/remove` | 4 loại provider, kể cả input sai (thiếu `--api-key`, sai `--type`) |
| Integration | `model set/switch` | model tồn tại vs không tồn tại, ghi đúng field global/project |
| Integration | `plugin add/list/remove` | cài, liệt kê, gỡ, `--force` ghi đè version cũ |
| Integration | `session export/import/list/delete/stats` | roundtrip export → import ra session giống hệt; `--sanitize` redact đúng |
| Integration | `config init/validate` | không ghi đè khi chưa có `--force`; phát hiện key lạ |
| E2E (script) | toàn bộ workflow "cài mới máy" | init config → add provider → set model → cài 1 plugin → verify tất cả |
| Regression | `--dry-run` mọi lệnh side-effect | filesystem hash không đổi trước/sau |
| Regression | `--json` mọi lệnh list/status | output parse được, không lẫn log text |
| Compat | so với `opencode --version` đang cài | lệnh gốc được wrap còn đúng flag như docs ghi |

---

## F. Đối chiếu với input gốc của người dùng (traceability)

| Yêu cầu gốc | Đã đáp ứng ở đâu | Trạng thái |
|---|---|---|
| "Tìm tất cả docs, cấu hình..." | Mục A | ☐ |
| "connect provider, api, cài plugin, skill, backup/restore session" | Mục B1–B7 | ☐ |
| "đầy đủ args, env (fallback từ env qua args)" — *lưu ý: thứ tự đúng theo chuẩn CLI là flag ưu tiên cao nhất, env fallback khi thiếu flag, không phải ngược lại* | Mục C | ☐ |
| "không có thì phải có default, đảm bảo logic chạy ổn" | Mục C | ☐ |
| "đi sâu add provider: add api, add api compact, đổi model" | Mục D | ☐ |
| "TypeScript, Node.js 24" | Mục C (dòng 1–2) | ☐ |
| "phải dùng fetch/search tìm tài liệu mới nhất" | Mục A | ☐ |

> ⚠️ Điểm cần làm rõ với user: câu gốc "fallback từ env qua args" hơi ngược với thứ tự ưu tiên chuẩn (flag phải thắng env). Checklist này đang follow đúng thứ tự **flag > env > config > default** như đã thống nhất ở bản prompt kỹ thuật — nếu ý người dùng thực sự muốn env thắng flag thì cần xác nhận lại trước khi chấm "Done".

---

## G. Hướng mở rộng (không bắt buộc cho v1, nhưng nên thiết kế để không phải viết lại)

- [ ] `ocx doctor` — health-check toàn diện: version OpenCode, tất cả provider đã auth, MCP server nào offline, plugin nào lỗi.
- [ ] `ocx profile` — nhiều bộ config đặt tên sẵn (vd. "work", "personal") để switch nhanh giữa các set provider/model khác nhau.
- [ ] Shell completion (`bash`/`zsh`/`fish`) cho toàn bộ command tree.
- [ ] Cơ chế plugin cho chính `ocx` (không phải plugin của OpenCode) để cộng đồng mở rộng thêm sub-command.
- [ ] `ocx session export --all --schedule` — tích hợp cron/launchd để tự backup session định kỳ.
- [ ] Cảnh báo tự động khi phát hiện OpenCode có breaking change (so sánh version cài với danh sách version đã test) trước khi chạy lệnh ghi config.
- [ ] Chế độ "remote team config" — đồng bộ `opencode.json` (không gồm secret) qua git để cả team dùng chung chuẩn provider/model.
- [ ] Hỗ trợ TUI nhỏ (dùng `ink` hoặc tương tự) cho `provider add` / `model switch` thay vì chỉ prompt tuần tự.
