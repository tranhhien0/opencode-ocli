# ADR-004: Testing Strategy với Vitest

## Status
Accepted

## Context
Dự án cần một strategy testing nhất quán để đảm bảo chất lượng code và tránh regressions khi mở rộng tính năng.

## Decision
Sử dụng Vitest cho unit tests và integration tests.

### Lý do chọn Vitest:
- Tương thích hoàn toàn với Vite ecosystem
- Fast test execution với parallel runs
- Jest-compatible API, dễ migrate
- Built-in coverage reporting
- Good TypeScript support
- Watch mode cho development

### Test Structure:
```
tests/
├── config.test.ts          # Unit tests cho config.ts
├── opencode-shell.test.ts  # Integration tests với mocked spawn
└── provider.test.ts        # Tests cho provider commands
```

### Coverage Targets:
- Critical paths (config read/write, error handling): 90%+
- Core utilities: 80%+
- CLI commands: 70%+

## Consequences
### Positive:
- Fast feedback loop trong development
- Catch bugs early
- Documentation through tests
- Confidence khi refactoring

### Negative:
- Thời gian viết tests ban đầu
- Cần maintain tests cùng với code

## Implementation
File: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## Test Guidelines
1. **Unit Tests**: Test individual functions với mocked dependencies
2. **Integration Tests**: Test interactions giữa các modules
3. **Mock External Dependencies**: Sử dụng `vi.mock()` cho child_process, fs, etc.
4. **Test Edge Cases**: Empty inputs, invalid data, network failures
5. **Descriptive Test Names**: Mô tả rõ behavior được test

## Example Test
```typescript
import { describe, it, expect, vi } from 'vitest';
import { readConfig } from '../src/lib/config.js';

describe('config.ts', () => {
  it('should return default config when file does not exist', () => {
    const config = readConfig('/tmp/nonexistent.json');
    expect(config).toEqual({ $schema: 'https://opencode.ai/config.json' });
  });
});
```
