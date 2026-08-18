# Prompt: Thiết kế & build một CLI quản trị nhanh cho OpenCode (opencode.ai)

## 0. Bối cảnh
Tôi đang dùng **OpenCode** (`sst/opencode`, CLI AI coding agent chạy trong terminal, hỗ trợ 75+ provider qua AI SDK + Models.dev). OpenCode đã có CLI gốc (`opencode ...`) và file cấu hình `opencode.json` / `~/.local/share/opencode/auth.json`, nhưng các thao tác quản trị hàng ngày (đổi provider, đổi model, cài plugin/skill, backup–restore session…) còn rời rạc, phải nhớ nhiều lệnh con và phải sửa tay JSON.

Tôi cần bạn đóng vai **kỹ sư CLI**, thiết kế và triển khai một **CLI wrapper/companion** (đặt tên gợi ý: `ocx` hoặc `opencode-ctl`) viết bằng **TypeScript, chạy trên Node.js 24**, giúp tôi thực hiện nhanh các thao tác cấu hình/vận hành OpenCode mà không phải nhớ raw command hay sửa tay file JSON.

## 1. Yêu cầu nghiên cứu bắt buộc (làm TRƯỚC khi thiết kế)
Trước khi đưa ra kiến trúc hay code, hãy **web search / fetch tài liệu chính thức mới nhất** (đừng chỉ dựa vào kiến thức cũ), tối thiểu các nguồn sau — và note lại phiên bản/ngày cập nhật bạn tham khảo:

- `https://opencode.ai/docs/` (Intro, Getting Started)
- `https://opencode.ai/docs/cli/` — toàn bộ command + global flags + env vars
- `https://opencode.ai/docs/config/` — cấu trúc `opencode.json`, `$schema`
- `https://opencode.ai/docs/providers/` — danh sách provider, cách auth từng loại (OAuth `/connect`, API key, custom OpenAI-compatible)
- `https://opencode.ai/docs/models/` — cách chọn/switch model, model variant, `--refresh`
- `https://opencode.ai/docs/mcp-servers/` — MCP server add/list/auth
- `https://opencode.ai/docs/skills/` — Agent Skills: cấu trúc thư mục, cách load
- `https://opencode.ai/docs/plugins/` — plugin system, `opencode plugin <module>`
- `https://opencode.ai/docs/permissions/`, `/docs/agents/`, `/docs/server/`, `/docs/sdk/`
- Repo GitHub `sst/opencode` (source `provider/`, `config/`, `auth/`) nếu cần đối chiếu hành vi thực tế so với docs (docs cộng đồng đôi khi lệch bản mới nhất).

Nếu tài liệu có phần nào mơ hồ (ví dụ format chính xác của `auth.json`, thứ tự ưu tiên credential), hãy **tìm thêm nguồn thứ cấp** (blog, DeepWiki, GitHub issues) để xác nhận, và ghi chú rõ chỗ nào là suy luận vs. chỗ nào có nguồn xác nhận.

## 2. Phạm vi chức năng cần thiết kế
CLI cần bọc (wrap) lại các nhóm lệnh gốc của OpenCode, tối thiểu:

1. **Provider & Auth**
   - Liệt kê provider đã kết nối / chưa kết nối (`auth list`)
   - Thêm provider mới — xem chi tiết yêu cầu ở mục 4
   - Xoá / logout provider (`auth logout`)
   - Kiểm tra "health check" nhanh: provider đã có key hợp lệ chưa, model có load được không
2. **Model**
   - Liệt kê model theo provider (`models [provider]`, `--refresh`, `--verbose`)
   - Đổi model mặc định cho project/global (ghi vào config đúng key)
   - Set model variant (reasoning effort) nếu provider hỗ trợ
3. **Plugin**
   - Cài plugin (`plugin <module>`, `--global`, `--force`)
   - Liệt kê plugin đã cài (đọc từ config)
   - Gỡ plugin
4. **Agent Skills**
   - Liệt kê skill khả dụng (global + project `.opencode`/`.claude`)
   - Thêm/enable/disable skill
5. **MCP servers**
   - `mcp add / list / auth / logout / debug`
6. **Session**
   - Backup (export) 1 session hoặc toàn bộ ra file (`export`, `--sanitize`)
   - Restore (import) từ file JSON hoặc share URL (`import`)
   - List / delete / stats session
7. **Config bootstrap**
   - Khởi tạo `opencode.json` mới với giá trị mặc định an toàn nếu chưa tồn tại
   - Validate config hiện có (đúng schema, không có key lạ)
8. **Server/daemon tiện ích** (tuỳ chọn, mức độ ưu tiên thấp hơn): wrap `serve` / `web` / `attach` với các flag hay dùng.

## 3. Yêu cầu kỹ thuật bắt buộc
- Ngôn ngữ: **TypeScript**, runtime **Node.js 24** (dùng ESM, `node:` built-ins, không cần polyfill).
- Framework CLI: đề xuất và so sánh ngắn gọn 1–2 lựa chọn (vd. `commander`, `yargs`, `citty`, `clipanion`) rồi chọn 1, giải thích lý do.
- **Mọi tham số cấu hình đều phải theo thứ tự ưu tiên rõ ràng**:
  `flag CLI (--xxx)` > `biến môi trường tương ứng` > `giá trị trong config file` > `giá trị mặc định (default) hard-code`.
  Với những field không có input nào ở trên → **luôn phải có default hợp lý**, tuyệt đối không để `undefined` gây crash runtime.
- Với mỗi lệnh, liệt kê rõ trong bảng: `flag | short flag | ENV var fallback | default value | mô tả`.
- Đặt tên biến môi trường theo namespace riêng của tool này (vd. `OCX_*`) nhưng **đồng thời tôn trọng/đọc lại** các biến môi trường gốc của OpenCode nếu liên quan (vd. `OPENCODE_CONFIG`, `OPENCODE_CONFIG_DIR`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENCODE_SERVER_PASSWORD`...) để không bị xung đột hay ghi đè sai.
- Xử lý lỗi: mọi lệnh gọi ra `opencode` binary hoặc ghi file JSON đều phải có try/catch, thông báo lỗi rõ ràng, exit code chuẩn (0 = ok, khác 0 = lỗi, phân loại lỗi nếu có thể).
- An toàn khi ghi file: backup file config/auth cũ trước khi ghi đè (vd. `.bak`), thao tác ghi phải atomic (ghi ra file tạm rồi rename).
- Validate input trước khi thao tác (vd. provider ID hợp lệ, path tồn tại, JSON parse được) — không "tin" mù input người dùng.
- Có chế độ `--dry-run` cho các lệnh có side-effect (ghi config, xoá, cài plugin).
- Log ở 2 mức: người dùng thường (gọn) và `--verbose/--debug` (chi tiết, in ra lệnh `opencode` thực sự được gọi).
- Output hỗ trợ cả dạng người đọc (table/text) và `--json` cho scripting.
- Viết theo module hoá: tách rõ `commands/`, `lib/config.ts` (đọc/ghi/merge config theo đúng thứ tự ưu tiên), `lib/opencode-shell.ts` (spawn tiến trình `opencode` con), `lib/env.ts` (resolve env/flag/default).

## 4. Đào sâu bắt buộc: quản lý Provider
Đây là phần quan trọng nhất, cần thiết kế kỹ:

- Liệt kê rõ **các nhóm provider** OpenCode hỗ trợ và cách auth tương ứng (dựa trên tài liệu đã research ở mục 1):
  - Provider có OAuth flow riêng qua `/connect` (vd. OpenCode Zen/Go, GitHub Copilot...).
  - Provider dùng API key chuẩn (Anthropic, OpenAI, Google, Groq, DeepSeek, OpenRouter...).
  - Provider **OpenAI-compatible tuỳ chỉnh** ("Other"/custom): cần nhập `provider ID`, `baseURL`, `apiKey`, danh sách `models` (model ID phải khớp chính xác với API upstream) — CLI phải có sub-command riêng để tạo nhanh block này trong `opencode.json` (`provider.<id>.options.baseURL`, `provider.<id>.models`), tương tự khái niệm mà user gọi là "add api compact" (tức thêm một API endpoint tương thích OpenAI/kiểu rút gọn, không phải OAuth).
  - Local model provider (vd. Ollama) — lưu ý về `num_ctx`, giới hạn context.
- CLI cần hỗ trợ:
  - `provider add` (interactive: chọn loại provider → hỏi field cần thiết → ghi đúng chỗ: OAuth/API key vào `auth.json`, custom provider block vào `opencode.json`).
  - `provider add --non-interactive` với đầy đủ flags (`--id`, `--type <oauth|api|openai-compatible|local>`, `--api-key`, `--base-url`, `--models <a,b,c>`) để dùng trong script/CI.
  - `provider remove/logout`.
  - `provider list` — phân biệt rõ provider nào đã auth, provider nào chỉ có trong models.dev nhưng chưa auth.
  - `provider verify <id>` — thử gọi thử 1 model nhỏ để xác nhận key/baseURL hoạt động, trả về lỗi cụ thể (401 do sai key, 404 do sai model ID, network do sai baseURL...).
  - `model set <provider>/<model>` — ghi vào đúng field default model trong config (global hoặc `--project`), và có validate model đó có tồn tại trong `opencode models <provider>` không trước khi ghi.
  - `model switch` — interactive picker để đổi nhanh model đang dùng.
- Giải thích rõ **độ ưu tiên credential** theo đúng cơ chế thật của OpenCode (env var > config `options.apiKey` > auth store `auth.json`, hoặc thứ tự đúng như tài liệu bạn tìm được — phải verify lại, đừng đoán) và đảm bảo CLI của tôi không phá vỡ thứ tự đó.

## 5. Đầu ra mong muốn
1. Bản tóm tắt ngắn các nguồn tài liệu đã đọc (link + ngày truy cập + điểm chính rút ra).
2. Thiết kế command tree đầy đủ (dạng cây hoặc bảng) kèm bảng flags/env/default cho từng lệnh.
3. Sơ đồ kiến trúc thư mục project TypeScript.
4. Code triển khai (Node.js 24 + TS), có thể chia nhiều file/artifact nếu dài — ưu tiên: `lib/env.ts` (resolve flag→env→default), `lib/config.ts`, các command nhóm `provider`, `model`, `plugin`, `session`.
5. Ví dụ sử dụng thực tế cho từng nhóm lệnh (đặc biệt nhóm provider, model).
6. Danh sách rủi ro/giả định cần tôi xác nhận thêm (vd. hành vi có thể đổi theo version OpenCode).

## 6. Ràng buộc khác
- Không hard-code bất kỳ API key / secret mẫu nào trong code — chỉ dùng placeholder rõ ràng.
- Toàn bộ code phải chạy được ngay bằng `tsx`/`node --experimental-strip-types` trên Node 24 mà không cần bước build riêng (nhưng vẫn nên có script build production tuỳ chọn).
- Ghi rõ version OpenCode CLI mà thiết kế này tương thích (dựa theo tài liệu tại thời điểm research), và cảnh báo nếu OpenCode có breaking change (vd. tài liệu "1.0 Migration") ảnh hưởng tới field nào trong config.
