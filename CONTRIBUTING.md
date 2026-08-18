# Contributing to OCX

Cảm ơn bạn đã quan tâm đến việc đóng góp cho OCX (OpenCode eXtension CLI)! Dưới đây là những hướng dẫn để giúp bạn đóng góp hiệu quả.

## Cách đóng góp

### 1. Báo cáo lỗi (Bug Reports)

Khi báo cáo lỗi, vui lòng cung cấp:
- Mô tả rõ ràng về lỗi
- Các bước để reproduce lỗi
- Kết quả mong đợi vs kết quả thực tế
- Phiên bản OCX và OpenCode đang sử dụng
- Hệ điều hành và môi trường chạy

### 2. Đề xuất tính năng (Feature Requests)

Khi đề xuất tính năng mới:
- Mô tả tính năng và lý do cần thiết
- Đưa ra ví dụ sử dụng cụ thể
- Kiểm tra xem tính năng đã tồn tại chưa

### 3. Pull Requests

#### Quy trình PR:
1. Fork repository
2. Tạo branch mới từ `main`:
   ```bash
   git checkout -b feature/ten-tinh-nang
   # hoặc
   git checkout -b fix/fix-loi-xyz
   ```
3. Thực hiện thay đổi
4. Chạy tests và lint:
   ```bash
   npm run test:run
   npm run lint
   npm run build
   ```
5. Commit với message rõ ràng theo convention:
   ```
   feat: thêm command session export
   fix: sửa lỗi parse JSONC config
   docs: cập nhật README
   ```
6. Push lên fork và tạo Pull Request

#### Yêu cầu code quality:
- Code phải pass ESLint (`npm run lint`)
- Tất cả tests phải pass (`npm run test:run`)
- Build thành công (`npm run build`)
- Thêm tests cho tính năng mới nếu có thể
- Giữ code đơn giản, dễ đọc

## Quy ước phát triển

### Code Style
- Sử dụng TypeScript strict mode
- Follow ESLint rules trong `.eslintrc.json`
- Đặt tên biến và function theo camelCase
- Sử dụng async/await thay vì Promise chains

### Testing
- Viết tests cho logic nghiệp vụ quan trọng
- Sử dụng Vitest cho unit tests
- Mock các external dependencies (opencode commands)

### Documentation
- Cập nhật README.md khi thêm tính năng mới
- Thêm JSDoc comments cho functions public
- Cập nhật examples trong help text của commands

## Kiến trúc project

```
src/
├── commands/     # Các command groups (provider, model, session...)
├── lib/          # Core libraries (config, logger, opencode-shell...)
└── index.ts      # Entry point
```

### Các module chính:
- **config.ts**: Đọc/ghi opencode.json với support JSONC
- **opencode-shell.ts**: Wrapper cho các lệnh opencode
- **error-handler.ts**: Xử lý và phân loại errors
- **logger.ts**: Structured logging với Pino

## Environment Setup

```bash
# Cài đặt dependencies
npm install

# Build project
npm run build

# Chạy dev mode
npm run dev -- <command>

# Chạy tests
npm run test

# Lint code
npm run lint
```

## Communication

- Thảo luận issues trên GitHub Issues
- PR reviews sẽ được thực hiện bởi maintainers

## License

By contributing to OCX, you agree that your contributions will be licensed under the ISC license.
