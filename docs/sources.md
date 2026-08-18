# So sánh nguồn tài liệu OpenCode

> Tài liệu này so sánh các nguồn thông tin về OpenCode để đảm bảo độ chính xác khi phát triển CLI `ocx`.

## Nguồn chính thức vs Cộng đồng

### ✅ Nguồn chính thức (Primary Sources)

| Nguồn | URL | Độ tin cậy | Ghi chú |
|-------|-----|-----------|---------|
| **OpenCode Docs** | https://opencode.ai/docs/ | ⭐⭐⭐⭐⭐ | Nguồn chính thức, luôn ưu tiên số 1 |
| **GitHub Repo** | https://github.com/tranhhien0/opencode-ocli | ⭐⭐⭐⭐⭐ | Source code, issues, releases |
| **npm Package** | https://www.npmjs.com/package/opencode | ⭐⭐⭐⭐⭐ | Version history, changelog |

### ⚠️ Nguồn cộng đồng (Secondary/Mirror)

| Nguồn | URL | Độ tin cậy | Ghi chú |
|-------|-----|-----------|---------|
| open-code.ai | https://open-code.ai/ | ⭐⭐⭐ | Community mirror, có thể lỗi thời |
| DeepWiki | https://deepwiki.com/tranhhien0/opencode-ocli | ⭐⭐ | Auto-generated, không nên dùng làm reference |
| Reddit/Discord | Various | ⭐⭐ | Discussion, tips nhưng không official |
| Blog cá nhân | Various | ⭐ | Kinh nghiệm cá nhân, có thể không đúng với version mới |

## Quy tắc sử dụng tài liệu

### Ưu tiên 1: Luôn check docs chính thức trước
- Khi implement tính năng mới → Đọc docs.opencode.ai/docs/{tính-năng}
- Khi gặp lỗi → Check GitHub issues trước
- Khi cần version info → Check npm hoặc `opencode --version`

### Ưu tiên 2: Chỉ dùng mirror khi docs chính thức không truy cập được
- Nếu opencode.ai down → Tạm dùng mirror NHƯNG phải đánh dấu `[MIRROR - cần verify]`
- Sau đó phải verify lại với docs chính thức khi có thể

### Ưu tiên 3: Đánh dấu giả định rõ ràng
Bất kỳ chỗ nào không có trong docs chính thức phải được đánh dấu:
```markdown
[GIẢ ĐỊNH – cần xác nhận] Giải thích ngắn gọn tại sao giả định như vậy.
```

## Bảng theo dõi cập nhật docs

| Ngày | Trang docs | Version OC | Thay đổi đáng chú ý | Người update |
|------|-----------|------------|-------------------|-------------|
| $(date +"%Y-%m-%d") | /docs/cli/ | $(opencode --version 2>/dev/null || echo "N/A") | Initial fetch | Auto |
| $(date +"%Y-%m-%d") | /docs/config/ | N/A | Initial fetch | Auto |
| $(date +"%Y-%m-%d") | /docs/providers/ | N/A | Initial fetch | Auto |

## Checklist verification tài liệu

Khi đọc tài liệu cho một tính năng, cần trả lời các câu hỏi sau:

- [ ] Link docs chính thức còn sống không?
- [ ] Version docs có khớp với version đang cài không?
- [ ] Có breaking changes nào so với version trước không?
- [ ] Có field/config nào bị deprecated không?
- [ ] Ví dụ trong docs có chạy được không?

## Các trang docs quan trọng cần theo dõi

### Core Documentation
1. `/docs/cli/` - Lệnh CLI và flags
2. `/docs/config/` - Cấu hình opencode.json
3. `/docs/providers/` - Provider setup và authentication
4. `/docs/models/` - Model configuration
5. `/docs/mcp-servers/` - MCP server integration

### Advanced Features
6. `/docs/plugins/` - Plugin system
7. `/docs/skills/` - Agent skills
8. `/docs/permissions/` - Permission system
9. `/docs/server/` - Server mode (serve/web/attach)
10. `/docs/sdk/` - SDK usage

### Migration & Breaking Changes
11. `/docs/migration/` hoặc `/docs/changelog/` - Breaking changes giữa versions

## Lưu trữ lịch sử docs

Scripts `fetch-docs.sh` tự động lưu docs với timestamp:
```
docs/official/
├── cli-2025-01-15_10-30-00.html
├── config-2025-01-15_10-30-00.html
└── ...
```

Để so sánh thay đổi giữa các phiên bản:
```bash
diff docs/official/cli-2025-01-15_*.html docs/official/cli-2025-01-16_*.html
```

---

*Cập nhật cuối: $(date +"%Y-%m-%d %H:%M:%S")*
