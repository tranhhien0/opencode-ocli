# REVIEW.md - Hướng dẫn Review tài liệu OCX

> Tài liệu này hướng dẫn quy trình review README và docs-notes để đảm bảo chất lượng trước khi release.

## Mục đích

Đảm bảo mọi tài liệu của OCX:
- Chính xác theo docs chính thức của OpenCode
- Không chứa thông tin lỗi thời
- Đánh dấu rõ các giả định chưa được xác nhận
- Có link verification đầy đủ

## Quy trình review

### Bước 1: Chuẩn bị

Người review cần:
1. Cài đặt OpenCode CLI version mới nhất
2. Clone repo ocx
3. Truy cập internet để verify links

```bash
npm install -g opencode@latest
opencode --version  # Ghi chú version
```

### Bước 2: Review README.md

Checklist cho README:

- [ ] **Version check**: Version OpenCode trong README có khớp với `opencode --version` không?
- [ ] **Installation commands**: Các lệnh cài đặt còn đúng không?
- [ ] **Example commands**: Chạy thử 3-5 ví dụ trong README xem có hoạt động không
- [ ] **Environment variables**: Kiểm tra các env var còn đúng tên không
- [ ] **Links**: Click vào tất cả links trong README xem có 404 không

Cách test nhanh:
```bash
# Test installation command từ README
ocx --help

# Test example commands
ocx provider list --json
ocx model set anthropic/claude-sonnet-4-20250514
ocx doctor
```

### Bước 3: Review docs-notes.md

Checklist cho docs-notes:

- [ ] **Links còn sống**: Mở từng link trong bảng "Chính thức (opencode.ai)"
- [ ] **Giả định được đánh dấu**: Tìm tất cả `[GIẢ ĐỊNH – cần xác nhận]` và verify
- [ ] **Version match**: Version OpenCode trong notes có khớp với thực tế không
- [ ] **Ngày truy cập**: Các ngày trong bảng có hợp lý không (không phải ngày trong tương lai)

Commands hữu ích:
```bash
# Tìm tất cả giả định chưa xác nhận
grep -n "GIẢ ĐỊNH" docs/docs-notes.md

# Check links trong markdown
npx markdown-link-check docs/docs-notes.md 2>/dev/null || echo "Install markdown-link-check first"
```

### Bước 4: Verify assumptions

Với mỗi giả định được đánh dấu:

1. **Research**: Đọc docs chính thức liên quan
2. **Test**: Chạy lệnh thực tế để verify
3. **Update**: 
   - Nếu đúng → Bỏ tag `[GIẢ ĐỊNH – cần xác nhận]`
   - Nếu sai → Sửa lại và update code nếu cần
   - Nếu vẫn chưa rõ → Giữ tag và thêm giải thích chi tiết hơn

Ví dụ:
```markdown
Trước:
[GIẢ ĐỊNH – cần xác nhận] Thứ tự ưu tiên credential: env var > auth.json > config file

Sau khi verify docs:
✅ Đã xác nhận: Thứ tự ưu tiên credential là env var > auth.json > config file (nguồn: https://opencode.ai/docs/providers/#authentication)
```

### Bước 5: Checklist-cli.md review

- [ ] Đọc từng mục trong checklist
- [ ] Đánh dấu ✅ cho mục đã hoàn thành
- [ ] Thêm link PR/commit cho mục mới hoàn thành
- [ ] Cập nhật trạng thái test coverage

### Bước 6: Sources.md review

- [ ] Kiểm tra links trong bảng nguồn chính thức
- [ ] Update version table với version hiện tại
- [ ] Thêm changelog nếu có thay đổi đáng kể

## Template report review

```markdown
## Review Report - OCX Documentation

**Reviewer**: <tên>
**Date**: YYYY-MM-DD
**OpenCode Version**: x.y.z

### Summary
- Tổng số links checked: XX
- Links broken: XX (đã fix/tạm xóa)
- Assumptions verified: XX/XX
- Issues found: XX

### Changes Made
1. Updated README.md - fixed installation command
2. Removed dead link in docs-notes.md
3. Verified assumption #3 about MCP OAuth flow
4. ...

### Remaining Issues
1. [ ] Giả định #2 về session format cần test thêm
2. [ ] Link migration docs trả về 404 - chờ docs update

### Recommendation
- [ ] Ready to merge
- [ ] Need minor fixes (see above)
- [ ] Need major revision
```

## Tools hỗ trợ

### Link checking
```bash
# Install tool
npm install -g markdown-link-check

# Check all markdown files
find docs -name "*.md" -exec markdown-link-check {} \;
```

### Version checking
```bash
# Get current opencode version
opencode --version

# Compare with package.json
jq -r '.dependencies.opencode // .devDependencies.opencode' package.json
```

### Automated checks (CI)
```yaml
# .github/workflows/docs-review.yml
jobs:
  docs-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check markdown links
        run: npx markdown-link-check README.md docs/*.md
      - name: Verify version
        run: |
          npm install -g opencode
          echo "OpenCode version: $(opencode --version)"
```

## Frequency

- **Minor review** (links, typos): Hàng tuần hoặc trước mỗi release
- **Major review** (assumptions, examples): Hàng tháng hoặc khi OpenCode ra version mới
- **Full review** (toàn bộ docs): Mỗi quarter

## Contact

Nếu có thắc mắc về quy trình review:
- GitHub Issues: https://github.com/tranhhien0/opencode-ocli/issues
- Email: (nếu có)

---

*Created: $(date +"%Y-%m-%d")*
*Last updated: $(date +"%Y-%m-%d")*
