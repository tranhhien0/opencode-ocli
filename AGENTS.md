# AGENTS.md — Quy tắc cho agent

## Version bump

Version tuân theo scheme `1.YYMMDD.1HHmm`, tính theo giờ Việt Nam (`Asia/Ho_Chi_Minh`):

- `YYMMDD` = năm (2 số) + tháng + ngày
- `1HHmm` = số `1` + giờ + phút
- Ví dụ: `1.260818.11538` (= 15:38 ngày 18/08/26 giờ VN)

### Khi nào bump

- Chỉ bump khi **chủ repo yêu cầu tăng version** (không tự ý bump trong quá trình sửa code).
- Dùng script có sẵn, **không sửa version thủ công** trong `package.json`:

```bash
npm run version:bump        # bump lên 1.YYMMDD.1HHmm theo giờ hiện tại
npm run version:bump:verify # bump + kiểm tra phải lớn hơn version đã publish trên npm
```

### Logic của `scripts/bump-version.mjs`

1. Tính version ứng viên `next = 1.YYMMDD.1HHmm` từ giờ VN hiện tại.
2. So sánh `next` với version trong `package.json` (so cặp `(YYMMDD, 1HHmm)`):
   - `next > current` → ghi đè `package.json` (JSON, 2-space indent, `\n` cuối file), exit `0`, in `version bumped X -> Y`.
   - `next <= current` (cùng phút hoặc sớm hơn) → **không đổi gì**, exit `1`, báo lỗi "wait until the next VN minute".
3. Với `--verify`: thêm bước so với `npm view <name> version` — nếu `next <= published` thì exit `1`.

### Hệ quả

- Độ phân giải theo **phút** → mỗi phút VN có tối đa 1 version.
- Bump 2 lần trong cùng 1 phút thì lần sau bị từ chối — chờ sang phút kế tiếp.
- Sau khi bump, script chỉ sửa `package.json`; commit/tag/publish là việc của chủ repo.