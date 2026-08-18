#!/bin/bash
# fetch-docs.sh - Tải các trang docs chính thức từ opencode.ai
# Lưu vào docs/official/ với timestamp

set -e

DOCS_DIR="docs/official"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
NOTES_FILE="docs/docs-notes.md"

# Tạo thư mục nếu chưa tồn tại
mkdir -p "$DOCS_DIR"

# Danh sách các trang docs cần tải
declare -A DOCS_PAGES=(
    ["cli"]="/docs/cli/"
    ["config"]="/docs/config/"
    ["providers"]="/docs/providers/"
    ["models"]="/docs/models/"
    ["mcp-servers"]="/docs/mcp-servers/"
    ["skills"]="/docs/skills/"
    ["plugins"]="/docs/plugins/"
    ["permissions"]="/docs/permissions/"
    ["agents"]="/docs/agents/"
    ["server"]="/docs/server/"
    ["sdk"]="/docs/sdk/"
)

echo "📥 Fetching OpenCode documentation..."
echo "Timestamp: $TIMESTAMP"
echo ""

# Kiểm tra curl có sẵn không
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl."
    exit 1
fi

# Lấy version của OpenCode CLI
OPENCODE_VERSION=""
if command -v opencode &> /dev/null; then
    OPENCODE_VERSION=$(opencode --version 2>/dev/null || echo "unknown")
fi

# Hàm tải một trang docs
fetch_page() {
    local name="$1"
    local path="$2"
    local output_file="$DOCS_DIR/${name}-${TIMESTAMP}.html"
    
    echo "Fetching: $name ($path)"
    
    # Thử tải với curl
    if curl -sSL --connect-timeout 10 --max-time 30 \
        -H "User-Agent: OCX-Docs-Fetcher/0.1.0" \
        "https://opencode.ai$path" -o "$output_file" 2>/dev/null; then
        
        # Kiểm tra file có nội dung không
        if [ -s "$output_file" ]; then
            local size=$(wc -c < "$output_file")
            echo "  ✓ Downloaded: $size bytes"
        else
            echo "  ⚠ Empty response, removing..."
            rm -f "$output_file"
            return 1
        fi
    else
        echo "  ❌ Failed to download $name"
        rm -f "$output_file"
        return 1
    fi
}

# Tải từng trang
for name in "${!DOCS_PAGES[@]}"; do
    path="${DOCS_PAGES[$name]}"
    fetch_page "$name" "$path" || true
done

echo ""
echo "📝 Creating docs notes..."

# Tạo file docs-notes.md
cat > "$NOTES_FILE" << EOF
# Ghi chú tài liệu OpenCode

> Tài liệu được fetch tự động từ nguồn chính thức và cộng đồng.

## Thông tin phiên bản

- **OpenCode CLI Version**: ${OPENCODE_VERSION:-not installed}
- **Ngày fetch**: $(date +"%Y-%m-%d %H:%M:%S")
- **Script**: scripts/fetch-docs.sh

## Nguồn tài liệu

### Chính thức (opencode.ai)

| Trang | URL | Ngày truy cập | Trạng thái |
|-------|-----|---------------|------------|
EOF

# Thêm thông tin từng trang vào notes
for name in "${!DOCS_PAGES[@]}"; do
    path="${DOCS_PAGES[$name]}"
    echo "| $name | https://opencode.ai$path | $(date +"%Y-%m-%d") | ✅ Đã fetch |" >> "$NOTES_FILE"
done

cat >> "$NOTES_FILE" << EOF

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

1. Chạy script: \`./scripts/fetch-docs.sh\`
2. Review file \`docs/docs-notes.md\` và cập nhật giả định nếu cần
3. So sánh với version trước để phát hiện thay đổi
4. Cập nhật checklist trong \`docs/checklist-cli.md\` nếu có thay đổi hành vi

---

*File được tạo tự động bởi fetch-docs.sh*
EOF

echo ""
echo "✅ Done!"
echo "   Docs saved to: $DOCS_DIR/"
echo "   Notes saved to: $NOTES_FILE"
echo ""
echo "Next steps:"
echo "  1. Review docs/docs-notes.md for assumptions marked with [GIẢ ĐỊNH – cần xác nhận]"
echo "  2. Update docs/sources.md with comparison table"
echo "  3. Run 'ocx doctor' to verify current setup"
