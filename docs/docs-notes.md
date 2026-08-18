# Ghi chú tài liệu OpenCode

> Tài liệu được fetch tự động từ nguồn chính thức và cộng đồng.

## Thông tin phiên bản

- **OpenCode CLI Version**: not installed
- **Ngày fetch**: 2026-08-18 02:06:28
- **Script**: scripts/fetch-docs.sh

## Nguồn tài liệu

### Chính thức (opencode.ai)

| Trang | URL | Ngày truy cập | Trạng thái |
|-------|-----|---------------|------------|
| server | https://opencode.ai/docs/server/ | 2026-08-18 | ✅ Đã fetch |
| providers | https://opencode.ai/docs/providers/ | 2026-08-18 | ✅ Đã fetch |
| permissions | https://opencode.ai/docs/permissions/ | 2026-08-18 | ✅ Đã fetch |
| mcp-servers | https://opencode.ai/docs/mcp-servers/ | 2026-08-18 | ✅ Đã fetch |
| cli | https://opencode.ai/docs/cli/ | 2026-08-18 | ✅ Đã fetch |
| agents | https://opencode.ai/docs/agents/ | 2026-08-18 | ✅ Đã fetch |
| skills | https://opencode.ai/docs/skills/ | 2026-08-18 | ✅ Đã fetch |
| plugins | https://opencode.ai/docs/plugins/ | 2026-08-18 | ✅ Đã fetch |
| sdk | https://opencode.ai/docs/sdk/ | 2026-08-18 | ✅ Đã fetch |
| models | https://opencode.ai/docs/models/ | 2026-08-18 | ✅ Đã fetch |
| config | https://opencode.ai/docs/config/ | 2026-08-18 | ✅ Đã fetch |

### Cộng đồng / Mirror

| Nguồn | URL | Ghi chú |
|-------|-----|---------|
| open-code.ai | https://open-code.ai/ | Community mirror (không chính thức) |
| DeepWiki | https://deepwiki.com/tranhhien0/opencode-ocli | Auto-generated docs from repo |
| GitHub Repo | https://github.com/tranhhien0/opencode-ocli | Source code và discussion |

## Giả định cần xác nhận

> Các mục dưới đây là suy luận từ code hoặc docs cũ, cần kiểm tra lại với docs mới nhất.

1. **[GIẢ ĐỊNH – cần xác nhận]** Thứ tự ưu tiên credential: env var > auth.json > config file. Cần kiểm tra docs providers để xác nhận.
2. **[GIẢ ĐỊNH – cần xác nhận]** Format export session JSON giống hệt format import. Cần test roundtrip.
3. **[GIẢ ĐỊNH – cần xác nhận]** MCP server remote type hỗ trợ OAuth flow giống như docs mô tả. Cần verify với thực tế.
4. **[GIẢ ĐỊNH – cần xác nhận]** Plugin system cho phép override commands của CLI gốc. Cần đọc kỹ docs plugins.

## Breaking Changes (Migration)

> Dựa trên trang migration của OpenCode (nếu có).

Chưa có thông tin về breaking changes từ phiên bản cũ. Cần theo dõi:
- https://opencode.ai/docs/migration/
- https://github.com/tranhhien0/opencode-ocli/releases

## Quy trình update docs

1. Chạy script: `./scripts/fetch-docs.sh`
2. Review file `docs/docs-notes.md` và cập nhật giả định nếu cần
3. So sánh với version trước để phát hiện thay đổi
4. Cập nhật checklist trong `docs/checklist-cli.md` nếu có thay đổi hành vi

---

*File được tạo tự động bởi fetch-docs.sh*
