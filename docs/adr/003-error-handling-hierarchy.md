# ADR-003: Error Handling với Error Hierarchy

## Status
Accepted

## Context
Dự án cần một hệ thống error handling nhất quán để:
- Phân biệt các loại lỗi khác nhau (network, config, auth, etc.)
- Cung cấp error codes cho debugging và monitoring
- Hỗ trợ error recovery strategies
- Cải thiện user experience với error messages rõ ràng

## Decision
Xây dựng error hierarchy kế thừa từ base class `OCXError` với error codes định nghĩa sẵn.

### Error Hierarchy:
```
OCXError (base)
├── NetworkError
├── ConfigError
├── OpenCodeError
├── AuthError
├── PermissionError
├── NotFoundError
├── TimeoutError
└── ValidationError
```

### Error Codes:
Mỗi error type có code riêng, ví dụ:
- `OCX_CONFIG_ERROR`: Lỗi config chung
- `OCX_CONFIG_NOT_FOUND`: Không tìm thấy file config
- `OCX_CONFIG_INVALID_JSON`: Config không phải JSON hợp lệ
- `OCX_NETWORK_TIMEOUT`: Network request timed out

## Consequences
### Positive:
- Dễ dàng catch và handle theo error type
- Error codes giúp debugging và support
- Consistent error messages
- Có thể implement retry logic dựa trên error type

### Negative:
- Code phức tạp hơn so với dùng Error thuần
- Cần maintain error codes list

## Implementation
File: `src/lib/errors.ts`
```typescript
export class OCXError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  
  constructor(message: string, code: string = 'OCX_UNKNOWN', details?: Record<string, unknown>) {
    super(message);
    this.name = 'OCXError';
    this.code = code;
    this.details = details;
  }
}

export class ConfigError extends OCXError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'OCX_CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}
```

## Usage Example
```typescript
try {
  const config = readConfig(path);
} catch (error) {
  if (error instanceof ConfigError) {
    // Handle config-specific error
    console.error(`Config error [${error.code}]: ${error.message}`);
  } else if (error instanceof NetworkError) {
    // Retry logic for network errors
    await retry(operation);
  }
}
```
