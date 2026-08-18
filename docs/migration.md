# Migration Guide - OpenCode Breaking Changes

> Tài liệu này ghi lại các breaking changes giữa các phiên bản OpenCode để giúp người dùng ocx migration an toàn.

## Version hiện tại

- **OCX CLI**: 0.1.0
- **OpenCode CLI**: *(kiểm tra bằng `opencode --version`)*

## Breaking Changes theo version

### Version 1.x (Chưa xác nhận)

> ⚠️ **[GIẢ ĐỊNH – cần xác nhận]** Nếu có version 1.x, cần kiểm tra trang migration chính thức.

#### Config structure changes
- Field `model` có thể đổi format từ `provider-model` sang `provider/model`
- Provider config structure thay đổi

#### CLI commands
- Lệnh `opencode export` có thể đổi flags
- Session storage location thay đổi

### Version 0.x → 1.x (Nếu có)

Chưa có thông tin chính thức. Theo dõi:
- https://opencode.ai/docs/migration/
- https://github.com/tranhhien0/opencode-ocli/releases
- https://www.npmjs.com/package/opencode?activeTab=versions

## Checklist Migration cho người dùng ocx

Khi nâng cấp OpenCode CLI, chạy các bước sau:

```bash
# 1. Kiểm tra version hiện tại
opencode --version

# 2. Chạy doctor để kiểm tra compatibility
ocx doctor

# 3. Backup config hiện tại
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.backup.$(date +%Y%m%d)

# 4. Backup sessions
ocx session backup --out-dir ./backups/sessions

# 5. Nâng cấp OpenCode
npm install -g opencode@latest

# 6. Kiểm tra lại config
ocx config validate

# 7. Test các lệnh cơ bản
ocx provider list
ocx model set <provider>/<model>
```

## Các field config có thể thay đổi

Dựa trên docs chính thức, các field sau có nguy cơ cao bị thay đổi giữa versions:

| Field | Risk Level | Ghi chú |
|-------|-----------|---------|
| `model` | High | Format có thể đổi |
| `provider.*` | Medium | Structure options có thể thay đổi |
| `mcp.*` | Medium | Remote server config có thể đổi |
| `permission` | Low | Ít khả năng thay đổi |
| `server.port` | Low | Default port có thể đổi |

## Rollback plan

Nếu gặp vấn đề sau khi nâng cấp:

```bash
# 1. Hạ version OpenCode
npm install -g opencode@<previous-version>

# 2. Restore config từ backup
cp ~/.config/opencode/opencode.json.backup.YYYYMMDD ~/.config/opencode/opencode.json

# 3. Restore sessions nếu cần
ocx session import ./backups/sessions/session-*.json
```

## Reporting issues

Nếu phát hiện breaking change chưa được document:

1. Tạo issue trên GitHub: https://github.com/tranhhien0/opencode-ocli/issues
2. Include:
   - OpenCode version trước và sau
   - Lỗi gặp phải
   - Config file (đã redact secrets)
   - Steps to reproduce

---

*Cập nhật cuối: $(date +"%Y-%m-%d")*
*Cần thêm thông tin từ docs chính thức về migration*
