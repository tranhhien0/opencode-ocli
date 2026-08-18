# ADR-001: Sử dụng JSONC cho Config Files

## Status
Accepted

## Context
OpenCode chính thức hỗ trợ JSONC (JSON with Comments) trong file cấu hình. 
Người dùng cần khả năng thêm comments vào config để giải thích các lựa chọn cấu hình.

## Decision
Sử dụng thư viện `jsonc-parser` thay vì `JSON.parse()` thuần để đọc config files.

### Lý do chọn jsonc-parser:
- Support đầy đủ JSONC syntax (comments, trailing commas)
- Lightweight, không dependencies
- Được Microsoft maintain và sử dụng trong VS Code
- API đơn giản, dễ tích hợp

## Consequences
### Positive:
- Users có thể thêm comments vào config
- Tương thích hoàn toàn với OpenCode
- Cải thiện developer experience

### Negative:
- Thêm dependency mới
- Parse time slightly slower than JSON.parse() (negligible)

## Implementation
File: `src/lib/config.ts`
```typescript
import { parse as parseJSONC } from 'jsonc-parser';

export function readConfig(configPath?: string): OpenCodeConfig {
  const content = fs.readFileSync(pathToUse, 'utf-8');
  const config = parseJSONC(content);
  // ... rest of implementation
}
```
