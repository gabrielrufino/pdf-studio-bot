---
trigger: always_on
description: Coding style guide enforcing formatting, naming conventions, import organization, TypeScript strictness, and project patterns derived from @antfu/eslint-config.
---

# Coding Style

All code in this repository MUST follow the conventions derived from [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) and established codebase patterns.

> [!IMPORTANT]
> **Maintenance Rule:** If you update or replace style-related dependencies in `package.json` (`@antfu/eslint-config`, `typescript`, `eslint`), you MUST review and update this rule (`.agents/rules/coding-style.md`).

---

## 1. Formatting

- **Indentation**: 2 spaces (no tabs).
- **Quotes**: Single quotes (`'`).
- **Semicolons**: Never use semicolons.
- **Trailing commas**: Always in multiline constructs (`arrays`, `objects`, `parameters`).
- **Bracket spacing**: Always space inside objects (`{ foo }`, not `{foo}`).
- **Brace style**: **Stroustrup** — `else`, `catch`, and `finally` MUST start on a new line after the closing brace `}`.

```typescript
if (condition) {
  doSomething()
}
else {
  doOther()
}

try {
  await action()
}
catch (error) {
  handleError(error)
}
finally {
  cleanup()
}
```

---

## 2. Imports

Group imports with blank lines in the following exact order:

1. **Type-only imports** (`import type { ... } from '...'`)
2. **Node.js built-ins** with mandatory `node:` prefix (`node:fs/promises`, `node:path`, `node:process`)
3. **External packages** (`grammy`, `zod`, etc.)
4. **Internal modules / aliases** (`../...`, `./...`)

### Rules
- Always use `import type` when importing types — do not mix type and value imports.
- Always use ESM `import` / `export` — never use `require()`.
- Sort imports alphabetically within each group.
- Avoid duplicate imports from the same module.

```typescript
import type { FilterQuery } from 'grammy'
import type { CustomContext } from '../types/custom-context.type'
import process from 'node:process'
import { run } from '@grammyjs/runner'

import { bot } from './config/bot'
import { logger } from './config/logger'
import { CommandEnum } from '../enums/command.enum'
```

---

## 3. TypeScript & Code Practices

- **Strict mode**: Always enabled.
- **No `any`**: Use `unknown` when types are truly not known.
- **No non-null assertions (`!`)**: Avoid unless strictly necessary (e.g. `process.env.BOT_TOKEN!`).
- **Type assertions**: Prefer `as Type`, avoid angle brackets `<Type>`.
- **Interfaces vs Types**: Use `interface` for object shapes; use `type` for unions, intersections, and aliases.
- **Immutability**: Prefer `const` over `let`. Never use `var`. Use `as const` for literal sets.
- **Logging**: Never use `console.log`. Always use `logger` from `src/config/logger.ts` (or `this.logger` in handlers).
- **Async**: Prefer `async`/`await` over promise chaining. Prefix floating promises at entry points with `void` (e.g. `void main()`).
- **Control flow**: Prefer guard clauses and early returns over deeply nested `if` statements.
- **Unused variables**: Prefix with `_` (e.g. `_ctx`) if intentionally unused.

---

## 4. Naming Conventions & File Suffixes

| Element | Convention | Example |
| :--- | :--- | :--- |
| **Files** | `kebab-case.<suffix>.ts` | `download.handler.ts`, `user.entity.ts` |
| **Classes** | `PascalCase` with suffix | `DownloadHandler`, `UserRepository`, `UserEntity` |
| **Enums** | `PascalCase` with `Enum` suffix | `CommandEnum`, `PlanTypeEnum` |
| **Enum members** | `PascalCase` | `CommandEnum.Download` |
| **Types / Interfaces**| `PascalCase` | `CustomContext`, `SessionData` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE`, `MAX_PRO_PAGES` |
| **Functions / Vars**| `camelCase` | `initReengagementJob`, `mongoClient` |
| **Schemas** | `PascalCase` with `Schema` suffix | `DownloadParamsSchema` |
| **Decorators** | `PascalCase` | `EnsureInitialized` |
| **Entity fields** | `snake_case` (MongoDB convention) | `created_at`, `plan_type` |

### File Suffixes
- `.handler.ts` (handlers) | `.repository.ts` (repositories) | `.entity.ts` (entities)
- `.enum.ts` (enums) | `.error.ts` (custom errors) | `.middleware.ts` (middlewares)
- `.schema.ts` (Zod schemas) | `.type.ts` (type aliases) | `.decorator.ts` (decorators)
- `.job.ts` (jobs) | `.spec.ts` (tests)

---

## 5. Architecture & Structure

- **Barrel files**: Every directory under `src/` has an `index.ts` re-exporting public symbols.
- **Handlers**: Extend `BaseHandler`, implement `onCommand()`, use `this.validateParams()`, `this.setSessionCommand()`, `this.resetSession()`.
- **Repositories**: Extend `BaseRepository<T>`, use `@EnsureInitialized` on methods requiring active DB connection.
- **Entities**: Extend `BaseEntity`, call `this.assign(input)` in constructor, use `snake_case` field names.
- **Errors**: Extend `Error`, set `this.name = 'CustomError'` in constructor.

---

## 6. Testing (Vitest)

- Test files are **co-located** with source files as `<name>.spec.ts` (not in a separate `test/` folder).
- Structure: `describe(ClassName.name, () => { ... })`.
- Vitest APIs: `describe`, `it`, `expect`, `vi`, `beforeEach`, etc. from `vitest`.
- In-memory database: Use `mongodb-memory-server` for database integration tests.
- Test commands: `pnpm test`, `pnpm test:watch`, `pnpm test:cov`.

---

## 7. Verification Checklist

Before finalizing changes, verify:
1. `pnpm lint` passes with no errors.
2. `pnpm build:check` passes TypeScript checks.
3. `pnpm test` passes.
4. Formatting complies (single quotes, no semicolons, 2 spaces, Stroustrup braces).
5. Imports grouped and sorted properly.
