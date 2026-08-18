# OCX - CLI quản lý OpenCode AI Assistant

[![Version](https://img.shields.io/npm/v/ocx)](https://www.npmjs.com/package/ocx)
[![License](https://img.shields.io/npm/l/ocx)](https://github.com/sst/opencode/blob/main/LICENSE)

**OCX (OpenCode eXtension CLI)** là công cụ dòng lệnh giúp quản lý cấu hình, providers, models, plugins và MCP servers cho [OpenCode AI Assistant](https://opencode.ai).

## 📋 Mục lục

- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Sử dụng nhanh](#-sử-dụng-nhanh)
- [Commands](#-commands)
  - [provider](#provider---quản-lý-providers)
  - [model](#model---quản-lý-models)
  - [plugin](#plugin---quản-lý-plugins)
  - [skill](#skill---quản-lý-agent-skills)
  - [mcp](#mcp---quản-lý-mcp-servers)
  - [session](#session---quản-lý-sessions)
  - [config](#config---quản-lý-cấu-hình)
  - [auth](#auth---quản-lý-xác-thực)
- [Global Options](#-global-options)
- [Biến môi trường](#-biến-môi-trường)
- [Tài liệu tham khảo](#-tài-liệu-tham-khảo)

## 🖥 Yêu cầu hệ thống

- **Node.js**: Phiên bản 18.0 trở lên
- **OpenCode**: Phải được cài đặt trước khi sử dụng OCX
  - Cài đặt OpenCode: [https://github.com/sst/opencode](https://github.com/sst/opencode)
  - Hoặc chạy: `curl -sSL https://opencode.ai/install | bash`

## 📦 Cài đặt

### Cài đặt global (khuyến nghị)

```bash
npm install -g ocx
```

Sau khi cài đặt, bạn có thể sử dụng `ocx` từ bất kỳ đâu:

```bash
ocx --help
```

### Sử dụng với npx (không cần cài đặt)

```bash
npx ocx --help
```

### Cài đặt từ source

```bash
git clone https://github.com/your-org/ocx.git
cd ocx
npm install
npm run build
npm link
```

## 🚀 Sử dụng nhanh

```bash
# Xem danh sách commands
ocx --help

# Liệt kê các providers đã kết nối
ocx provider list

# Thêm provider mới (interactive)
ocx provider add

# Set model mặc định
ocx model set anthropic/claude-sonnet-4-20250514

# Cài plugin
ocx plugin install opencode-helicone-session

# Khởi tạo config cho project
ocx config init --project
```

## 📚 Commands

### provider - Quản lý providers

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `list` | Liệt kê providers đã auth và available | `ocx provider list` |
| `add` | Thêm provider mới | `ocx provider add` |
| `remove <id>` | Xóa provider khỏi config | `ocx provider remove my-provider` |
| `verify <id>` | Kiểm tra provider có hoạt động không | `ocx provider verify openai` |

**Ví dụ chi tiết:**

```bash
# Thêm provider với API key
ocx provider add --type api --id openai --api-key $OPENAI_API_KEY

# Thêm custom OpenAI-compatible endpoint
ocx provider add \
  --type openai-compatible \
  --id my-llm \
  --base-url https://api.my-llm.com/v1 \
  --models gpt-4,gpt-3.5-turbo \
  --name "My Custom LLM"

# Verify provider với model cụ thể
ocx provider verify anthropic --model claude-3-5-sonnet-20241022
```

### model - Quản lý models

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `list [provider]` | Liệt kê models theo provider | `ocx model list anthropic` |
| `set <model-id>` | Set model mặc định | `ocx model set openai/gpt-4o` |
| `switch` | Interactive switch model | `ocx model switch` |
| `variant <model> <name>` | Set model variant | `ocx variant gpt-5 thinking` |

**Ví dụ chi tiết:**

```bash
# List tất cả models trong config
ocx model list

# List models từ API của provider
ocx model list google --refresh

# Set model cho project hiện tại
ocx model set anthropic/claude-opus-4-20250514 --project

# Switch model tương tác
ocx model switch
```

### plugin - Quản lý plugins

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `install <module>` | Cài plugin mới | `ocx plugin install opencode-helicone-session` |
| `remove <module>` | Gỡ plugin | `ocx plugin remove opencode-helicone-session` |
| `list` | Liệt kê plugins đã cài | `ocx plugin list` |

**Ví dụ chi tiết:**

```bash
# Cài plugin global
ocx plugin install opencode-helicone-session --global

# Force cài đặt lại
ocx plugin install my-plugin --force
```

### skill - Quản lý agent skills

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `list` | Liệt kê skills khả dụng | `ocx skill list` |
| `enable <name>` | Enable skill | `ocx skill enable code-reviewer` |
| `disable <name>` | Disable skill | `ocx skill disable verbose-mode` |

### mcp - Quản lý MCP servers

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `add <id>` | Thêm MCP server | `ocx mcp add sentry --type remote --url https://...` |
| `list` | Liệt kê MCP servers | `ocx mcp list` |
| `auth <id>` | Auth OAuth MCP server | `ocx mcp auth github` |
| `logout <id>` | Logout MCP server | `ocx mcp logout github` |
| `remove <id>` | Xóa MCP server | `ocx mcp remove sentry` |

**Ví dụ chi tiết:**

```bash
# Thêm remote MCP server
ocx mcp add sentry \
  --type remote \
  --url https://mcp.sentry.dev/mcp

# Thêm local MCP server
ocx mcp add everything \
  --type local \
  --command "npx -y @mcp/server-everything"
```

### session - Quản lý sessions

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `export [id]` | Export session ra file | `ocx session export --output backup.json` |
| `import <file>` | Import session từ file | `ocx session import backup.json` |
| `list` | Liệt kê sessions | `ocx session list` |
| `delete <id>` | Xóa session | `ocx session delete abc123` |

**Ví dụ chi tiết:**

```bash
# Export session với sanitize dữ liệu nhạy cảm
ocx session export --output session.json --sanitize

# Import session
ocx session import ./session.json
```

### config - Quản lý cấu hình

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `init` | Khởi tạo opencode.json mới | `ocx config init --project` |
| `validate` | Validate config hiện có | `ocx config validate` |
| `show` | Hiển thị config đang dùng | `ocx config show --json` |

**Ví dụ chi tiết:**

```bash
# Init config cho project hiện tại
ocx config init --project

# Validate config global
ocx config validate
```

### auth - Quản lý xác thực

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `list` | Liệt kê providers đã auth | `ocx auth list` |
| `logout <provider>` | Logout provider | `ocx auth logout github` |
| `verify <provider>` | Verify credentials | `ocx auth verify openai` |

## ⚙ Global Options

Các options có thể dùng với mọi lệnh:

| Option | Mô tả | Ví dụ |
|--------|-------|-------|
| `-v, --verbose` | Bật chế độ verbose, hiển thị chi tiết log | `ocx provider add --verbose` |
| `--json` | Output dạng JSON (phù hợp scripting) | `ocx provider list --json` |
| `--dry-run` | Không ghi file, chỉ hiển thị thay đổi | `ocx config init --dry-run` |
| `-p, --project` | Áp dụng cho project hiện tại (thay vì global) | `ocx model set openai/gpt-4o --project` |

## 🔧 Biến môi trường

| Biến | Mô tả | Giá trị mặc định |
|------|-------|------------------|
| `OCX_VERBOSE` | Bật chế độ verbose | `false` |
| `OCX_DRY_RUN` | Mặc định dry-run mode | `false` |
| `OPENCODE_CONFIG` | Path tới opencode.json | `~/.opencode/config.json` |
| `ANTHROPIC_API_KEY` | API key cho Anthropic | - |
| `OPENAI_API_KEY` | API key cho OpenAI | - |
| `GOOGLE_API_KEY` | API key cho Google AI | - |
| `GROQ_API_KEY` | API key cho Groq | - |

**Ví dụ thiết lập:**

```bash
export OCX_VERBOSE=true
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 📖 Tài liệu tham khảo

- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode GitHub Repository](https://github.com/sst/opencode)
- [OCX Source Code](https://github.com/your-org/ocx)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết thêm chi tiết.

## 📄 License

ISC License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 🛠 Development Guide

### Yêu cầu phát triển

- **Node.js**: 18.0+
- **npm**: 9.0+
- **OpenCode CLI**: Đã cài đặt và trong PATH

### Cài đặt từ source

```bash
git clone https://github.com/your-org/ocx.git
cd ocx
npm install
npm run build
npm link
```

### Commands hữu ích

```bash
# Chạy trong development mode (với hot reload)
npm run dev -- <command>

# Build production
npm run build

# Chạy tests
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # Với coverage report

# Lint code (nếu có ESLint)
npm run lint
```

### Cấu trúc project

```
ocx/
├── src/
│   ├── commands/         # CLI commands
│   │   ├── auth.ts
│   │   ├── config.ts
│   │   ├── doctor.ts
│   │   ├── mcp.ts
│   │   ├── model.ts
│   │   ├── other.ts
│   │   ├── plugin.ts
│   │   ├── provider.ts
│   │   ├── session.ts
│   │   └── skill.ts
│   ├── lib/              # Core libraries
│   │   ├── config.ts           # Config read/write/merge
│   │   ├── env.ts              # Environment variables
│   │   ├── error-handler.ts    # Error handling utilities
│   │   ├── errors.ts           # Error hierarchy
│   │   ├── logger.ts           # Structured logging
│   │   ├── opencode-client.ts  # OpenCode CLI abstraction
│   │   ├── opencode-shell.ts   # Shell execution
│   │   └── types.ts            # TypeScript types
│   └── index.ts          # Entry point
├── tests/                # Test files
│   ├── config.test.ts
│   ├── opencode-shell.test.ts
│   └── provider.test.ts
├── docs/
│   └── adr/              # Architecture Decision Records
├── .github/
│   └── workflows/        # CI/CD pipelines
└── package.json
```

### Viết tests mới

Tests sử dụng [Vitest](https://vitest.dev/). Tạo file `.test.ts` trong thư mục `tests/`:

```typescript
import { describe, it, expect } from 'vitest';
import { readConfig } from '../src/lib/config.js';

describe('config.ts', () => {
  it('should return default config when file does not exist', () => {
    const config = readConfig('/tmp/nonexistent.json');
    expect(config).toEqual({ $schema: 'https://opencode.ai/config.json' });
  });
});
```

### Logging

Project sử dụng [pino](https://getpino.io/) cho structured logging. Log level có thể điều chỉnh qua env var:

```bash
OCX_LOG_LEVEL=debug npm run dev -- provider list
```

### Error Handling

Sử dụng error hierarchy từ `src/lib/errors.ts`:

```typescript
import { ConfigError, NetworkError } from './lib/errors.js';

try {
  // some operation
} catch (error) {
  if (error instanceof ConfigError) {
    // Handle config error
  } else if (error instanceof NetworkError) {
    // Retry or show network error message
  }
}
```

---

## 📚 Architecture Decision Records (ADRs)

ADRs ghi lại các quyết định kiến trúc quan trọng của project:

| ADR | Title | Description |
|-----|-------|-------------|
| [001](docs/adr/001-use-jsonc-for-config.md) | Sử dụng JSONC cho Config Files | Quyết định dùng jsonc-parser thay vì JSON.parse() |
| [002](docs/adr/002-structured-logging-with-pino.md) | Structured Logging với Pino | Lựa chọn pino cho hệ thống logging |
| [003](docs/adr/003-error-handling-hierarchy.md) | Error Handling Hierarchy | Thiết kế error hierarchy và error codes |
| [004](docs/adr/004-testing-strategy-with-vitest.md) | Testing Strategy với Vitest | Chiến lược testing và guidelines |
| [005](docs/adr/005-opencode-client-abstraction.md) | OpenCodeClient Abstraction | Abstraction layer cho OpenCode CLI interactions |

---

## 🔍 Troubleshooting

### Lỗi thường gặp

**1. "OpenCode CLI not found"**
```bash
# Kiểm tra OpenCode đã cài chưa
which opencode

# Nếu chưa, cài đặt
curl -sSL https://opencode.ai/install | bash
```

**2. Config validation failed**
```bash
# Validate config hiện tại
ocx config validate

# Reset về default
ocx config init --global
```

**3. Permission denied khi ghi config**
```bash
# Kiểm tra quyền file
ls -la ~/.opencode/config.json

# Fix quyền nếu cần
chmod 644 ~/.opencode/config.json
```

### Debug mode

Bật verbose logging để xem chi tiết:

```bash
# Qua CLI flag
ocx provider list --verbose

# Qua env var
OCX_VERBOSE=true ocx provider list

# Full debug logs
OCX_LOG_LEVEL=debug ocx provider list
```

### Report bugs

Gặp bug? Tạo issue tại: https://github.com/your-org/ocx/issues

Kèm theo:
- Phiên bản OCX (`ocx --version`)
- Phiên bản Node.js (`node --version`)
- OS và version
- Steps to reproduce
- Logs (với `--verbose` hoặc `OCX_LOG_LEVEL=debug`)
