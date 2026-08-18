# ADR-005: OpenCodeClient Abstraction Layer

## Status
Accepted

## Context
Dự án cần một abstraction layer để:
- Encapsulate logic giao tiếp với OpenCode CLI
- Cung cấp retry và timeout mechanisms
- Dễ dàng mock trong tests
- Giảm duplication code trong các commands

## Decision
Xây dựng class `OpenCodeClient` trong `src/lib/opencode-client.ts` với các methods:
- `listModels(provider?)`
- `listAuthProviders()`
- `installPlugin(name, options)`
- `exportSession(id, options)`
- `runCommand(args)` — generic method với retry và timeout

## Consequences
### Positive:
- Single source of truth cho OpenCode CLI interactions
- Consistent error handling across commands
- Easy to test với dependency injection
- Retry logic centralized

### Negative:
- Thêm layer of abstraction có thể làm phức tạp debugging
- Cần maintain client interface khi OpenCode CLI thay đổi

## Implementation
File: `src/lib/opencode-client.ts`
```typescript
export class OpenCodeClient {
  private options: Required<ClientOptions>;

  constructor(options: ClientOptions = {}) {
    this.options = {
      verbose: options.verbose ?? false,
      dryRun: options.dryRun ?? false,
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
    };
  }

  async listModels(provider?: string): Promise<Model[]> {
    // Implementation
  }

  async runCommand(args: string[]): Promise<CommandResult> {
    // Generic method với retry và timeout
  }
}
```

## Usage Example
```typescript
import { OpenCodeClient } from './lib/opencode-client.js';

const client = new OpenCodeClient({ 
  verbose: true, 
  timeout: 60000 
});

const models = await client.listModels('anthropic');
await client.installPlugin('my-plugin', { global: true });
```
