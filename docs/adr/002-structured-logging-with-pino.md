# ADR-002: Structured Logging với Pino

## Status
Accepted

## Context
Dự án cần một hệ thống logging có cấu trúc để:
- Debug dễ dàng hơn trong development
- Theo dõi errors trong production
- Hỗ trợ nhiều log levels (fatal, error, warn, info, debug, trace)
- Có thể tích hợp với các hệ thống log aggregation sau này

## Decision
Sử dụng thư viện `pino` cho structured logging thay vì `console.log`.

### Lý do chọn pino:
- Extremely fast (một trong những logger nhanh nhất Node.js ecosystem)
- Structured logging mặc định (JSON output)
- Support đầy đủ log levels
- Child loggers với context
- Low overhead, suitable for CLI tools
- Good TypeScript support

## Consequences
### Positive:
- Logs có cấu trúc, dễ parse và analyze
- Performance cao, ít ảnh hưởng đến CLI speed
- Dễ debug với context-rich logs
- Có thể output JSON để tích hợp với ELK/Datadog sau này

### Negative:
- Thêm dependency mới
- Learning curve nhỏ cho contributors mới

## Implementation
File: `src/lib/logger.ts`
```typescript
import pino from 'pino';

export const log = {
  fatal: (msg: string, context?: Record<string, unknown>) => 
    getLogger().fatal(context, msg),
  error: (msg: string, context?: Record<string, unknown>) => 
    getLogger().error(context, msg),
  warn: (msg: string, context?: Record<string, unknown>) => 
    getLogger().warn(context, msg),
  info: (msg: string, context?: Record<string, unknown>) => 
    getLogger().info(context, msg),
  debug: (msg: string, context?: Record<string, unknown>) => 
    getLogger().debug(context, msg),
  trace: (msg: string, context?: Record<string, unknown>) => 
    getLogger().trace(context, msg),
};
```

Log level có thể được điều chỉnh qua env var `OCX_LOG_LEVEL`.
