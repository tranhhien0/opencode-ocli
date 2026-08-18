# OpenCode Research Notes

## Phiên bản hiện tại

**Lưu ý**: Tài liệu này được tạo dựa trên tìm kiếm và phân tích từ codebase hiện có. Một số thông tin có thể là giả định cần được xác minh.

### Version Information
- **Phiên bản OCX**: 0.1.0 (từ package.json)
- **OpenCode CLI version**: Cần kiểm tra bằng lệnh `opencode --version`
- **Ngày nghiên cứu**: $(date +%Y-%m-%d)

---

## Tài liệu tham khảo chính thức

### Links quan trọng
1. **Trang chủ**: https://opencode.ai
2. **Documentation**: https://opencode.ai/docs/
3. **GitHub Repository**: [Cần tìm kiếm]
4. **1.0 Migration Guide**: https://opencode.ai/docs/migration (nếu có)

### Các trang docs cần đọc
- Provider Configuration
- Model Management
- MCP Servers
- Session Management
- Plugin System
- Authentication Flow

---

## Bảng so sánh tính năng

| Tính năng | Chính thức (OpenCode) | Cộng đồng (OCX) | Ghi chú |
|-----------|----------------------|-----------------|---------|
| Provider List | ✓ | ✓ | OCX bổ sung hiển thị chi tiết |
| Provider Add | ✓ | ✓ | OCX có interactive mode |
| Provider Verify | ✓ | ✓ | OCX có timeout và error handling chi tiết |
| Model List | ✓ | ✓ | OCX hỗ trợ filter theo provider |
| Model Set | ✓ | ✓ | OCX phân biệt global/project |
| Model Switch | [GIẢ ĐỊNH] | ✓ | OCX thêm interactive picker |
| Plugin Install | ✓ | ✓ | OCX có dry-run support |
| MCP Add | ✓ | ✓ | OCX validate type/url/command |
| MCP Auth | ✓ | ✓ | OCX hiển thị auth method rõ ràng |
| Session Export | ✓ | ✓ | OCX có sanitize option |
| Session Import | ✓ | ✓ | OCX hỗ trợ import từ URL |
| Config Validate | ✓ | ✓ | OCX check unknown keys và type errors |
| Server/Daemon | ✓ | ✓ | OCX có serve/web/attach commands |
| Skill Management | [GIẢ ĐỊNH] | ✓ | OCX tự implement |
| Profile Management | [GIẢ ĐỊNH] | [TODO] | Chưa implement |

---

## Các giả định cần xác minh [GIẢ ĐỊNH]

### 1. Cấu trúc thư mục skills
```
~/.config/opencode/skills/   # Global skills
./.opencode/skills/          # Project skills
```
**Trạng thái**: Cần xác minh từ docs chính thức

### 2. Schema config chuẩn
Các keys được cho là thuộc schema chuẩn:
- `$schema`
- `model`
- `autoupdate`
- `server` (port, host)
- `permission` (edit, bash)
- `provider` (object)
- `mcp` (object)
- `plugin` (array)
- `instructions` (array)
- `formatter` (object)
- `lsp` (object)

**Trạng thái**: Cần đối chiếu với schema.json chính thức

### 3. Preloaded providers
OpenCode mặc định preload các providers:
- `openai`
- `anthropic`
- `google`
- `groq`

**Trạng thái**: [GIẢ ĐỊNH] - Cần kiểm tra từ source code OpenCode

### 4. OAuth flow cho MCP
Các MCP servers dùng OAuth có field:
```json
{
  "auth": {
    "type": "oauth",
    "url": "https://..."
  }
}
```

**Trạng thái**: [GIẢ ĐỊNH] - Cần xác minh từ docs MCP

---

## API Endpoints (cần xác minh)

### Provider Verification
```
POST https://api.openai.com/v1/chat/completions
Headers: Authorization: Bearer <API_KEY>
Body: { model: "gpt-4o-mini", messages: [...], max_tokens: 5 }
```

### Model List
```
GET https://api.anthropic.com/v1/models
GET https://api.openai.com/v1/models
```

---

## Checklist xác minh

- [ ] Kiểm tra phiên bản OpenCode hiện tại
- [ ] Đọc migration guide từ version cũ lên 1.0
- [ ] Xác minh cấu trúc thư mục skills
- [ ] Đối chiếu schema config với docs chính thức
- [ ] Test các provider preload mặc định
- [ ] Xác minh OAuth flow cho MCP servers
- [ ] Kiểm tra session export/import format

---

## Nguồn tham khảo cộng đồng

1. GitHub Issues của OpenCode
2. Discord/Slack community
3. Blog posts về OpenCode
4. Stack Overflow tags

---

*Lưu ý: Tài liệu này sẽ được cập nhật khi có thêm thông tin chính thức từ OpenCode.*
