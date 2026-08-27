---
name: coding-style
description: >
  Coding style guide for the pdf-studio-bot repository. Enforces formatting,
  naming conventions, import organization, TypeScript strictness, testing patterns,
  and project structure rules derived from @antfu/eslint-config and the existing codebase.
  Use when writing or reviewing code to ensure consistency. Also, you must UPDATE this skill
  if you ever update or change style-related dependencies (like @antfu/eslint-config, typescript, eslint).
---

# Coding Style

This skill defines the coding style enforced in the **pdf-studio-bot** repository. All code
contributions MUST follow these rules. The style is derived from the
[`@antfu/eslint-config`](https://github.com/antfu/eslint-config) ESLint preset and the patterns
established in the existing codebase.

> [!IMPORTANT]
> **Maintenance Rule:** If you update or replace any style-related dependencies in `package.json` 
> (e.g., `@antfu/eslint-config`, `typescript`, `eslint`), you MUST review and update this skill
> (`.agents/skills/coding-style/SKILL.md`) to reflect the new rules and conventions.

---

## 1. Formatting

| Rule | Value |
| --- | --- |
| Indentation | **2 spaces** (no tabs) |
| Quotes | **Single quotes** (`'`) |
| Semicolons | **No semicolons** |
| Trailing commas | **Always** (ES5-compatible — arrays, objects, parameters) |
| Bracket spacing | **Yes** — `{ foo }` not `{foo}` |
| Arrow parens | **As needed** — `x => x` but `(x, y) => x + y` |
| Object curly newline | **Consistent** — either all on one line or all on separate lines |
| Max line length | No hard limit, but prefer readable line widths (~100–120 chars) |
| End of file | **Always** end with a single blank line |
| No multiple blank lines | At most **one** consecutive blank line |
| Block spacing | Always a space inside single-line blocks — `{ return true }` |
| Comma dangle | **Always trailing** in multiline constructs |
| Brace style | **Stroustrup** — `else` / `catch` / `finally` on a new line after `}` |
| Generator spacing | Star attached to keyword — `async* function()` or `function* ()` |

### Example — Brace style (Stroustrup)

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

The import order MUST follow this sequence, with blank lines between groups:

1. **Type-only imports** (`import type { ... } from '...'`) — always use `import type` when
   importing only types
2. **Node.js built-ins** (`node:fs`, `node:path`, etc.) — always use the `node:` prefix
3. **External packages** (from `node_modules`)
4. **Internal aliases / project modules** (relative imports `'../...'`)

### Rules

- **Always use `import type`** for type-only imports — never mix type and value imports
- **Always use `node:` prefix** for Node.js built-in modules (`node:fs/promises`, `node:path`,
  `node:process`, etc.)
- **No `require()` calls** — use ESM `import` exclusively
- **No duplicate imports** from the same module
- **Sorted** — imports within a group should be sorted alphabetically

### Example

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

## 3. TypeScript

- **Strict mode is ON** — all strict type-checking options are enabled
- **No `any`** — avoid `any`; use `unknown` when the type is truly unknown
- **No non-null assertions** — avoid `!` except when absolutely necessary (e.g., `process.env.BOT_TOKEN!`)
- **Consistent type assertions** — use `as` syntax, not angle brackets
- **Use `type` keyword for type-only exports and imports**
- **Prefer interfaces** for object shapes when they don't require intersection types; use `type`
  for unions, intersections, and complex types
- **Target** — `es2016`, module: `esnext`, module resolution: `bundler`
- **Experimental decorators** are enabled and used (e.g., `@EnsureInitialized`)

---

## 4. Naming Conventions

| Element | Convention | Example |
| --- | --- | --- |
| Files | **kebab-case** with a **suffix indicating the type** | `download.handler.ts`, `base.repository.ts` |
| Classes | **PascalCase** with type suffix | `DownloadHandler`, `BaseRepository`, `UserEntity` |
| Enums | **PascalCase** with `Enum` suffix | `CommandEnum`, `PlanTypeEnum` |
| Enum members | **PascalCase** | `CommandEnum.Download`, `PlanTypeEnum.Pro` |
| Interfaces | **PascalCase** with optional `I` prefix | `SessionData`, `ISession` |
| Types | **PascalCase** with type suffix | `CustomContext` (suffix: `.type.ts`) |
| Constants | **UPPER_SNAKE_CASE** | `MAX_FILE_SIZE`, `MAX_PRO_PAGES` |
| Functions | **camelCase** | `initReengagementJob`, `handleHandlerError` |
| Variables | **camelCase** | `mongoClient`, `userRepository` |
| Schema constants | **PascalCase** with `Schema` suffix | `DownloadParamsSchema`, `JoinParamsSchema` |
| Inferred types from schemas | **PascalCase** with `Params` suffix | `DownloadParams`, `JoinParams` |
| Middleware exports | **camelCase** with `Middleware` suffix | `i18nMiddleware`, `authMiddleware` |
| Error classes | **PascalCase** with `Error` suffix | `InvalidFileError`, `SessionValidationError` |
| Decorators | **PascalCase** function | `EnsureInitialized` |

### File name suffixes

| Suffix | Directory | Purpose |
| --- | --- | --- |
| `.handler.ts` | `handlers/` | Command/event handlers |
| `.repository.ts` | `repositories/` | Data access layer |
| `.entity.ts` | `entities/` | MongoDB document models |
| `.enum.ts` | `enums/` | TypeScript enums |
| `.error.ts` | `errors/` | Custom error classes |
| `.middleware.ts` | `middlewares/` | Grammy middleware functions |
| `.schema.ts` | `schemas/` | Zod validation schemas |
| `.type.ts` | `types/` | TypeScript type aliases |
| `.decorator.ts` | `decorators/` | Decorator functions |
| `.message.ts` | `messages/` | Message builders |
| `.job.ts` | `jobs/` | Scheduled jobs |
| `.spec.ts` | co-located | Test files |

---

## 5. Project Structure

```text
src/
├── config/          # App configuration (bot, database, logger, constants)
├── decorators/      # TypeScript decorators
├── entities/        # MongoDB document models (extend BaseEntity)
├── enums/           # TypeScript enums
├── errors/          # Custom error classes (extend Error)
├── handlers/        # Bot command handlers (extend BaseHandler)
├── interfaces/      # TypeScript interfaces
├── jobs/            # Scheduled/cron jobs
├── locales/         # i18n JSON translation files
├── messages/        # Message builder classes
├── middlewares/     # Grammy middleware functions
├── repositories/    # Data access layer (extend BaseRepository)
├── schemas/         # Zod validation schemas
├── types/           # TypeScript type aliases
└── index.ts         # Application entry point
```

### Rules

- Each directory has an `index.ts` **barrel file** that re-exports public modules
- Test files (`.spec.ts`) are **co-located** with their source files, not in a separate `test/`
  directory
- Configuration files live in `src/config/`
- Entity field names use **snake_case** to match MongoDB conventions (e.g., `created_at`,
  `plan_type`, `daily_usage_count`)

---

## 6. Classes & Patterns

### Handler pattern

- All handlers extend `BaseHandler`
- Must declare: `command`, `description`, `events`, `onCommand()`
- Use dependency injection via constructor
- Use `this.logger` (inherited) for logging
- Use `this.validateParams()` for session param validation
- Use `this.setSessionCommand()` / `this.resetSession()` for session lifecycle

### Repository pattern

- All repositories extend `BaseRepository<T>`
- Decorated methods use `@EnsureInitialized` to auto-init
- Constructor receives `database` and declares `collectionName`, `validator`, and optional `indexes`
- Instances are created and exported from `repositories/index.ts`

### Entity pattern

- All entities extend `BaseEntity`
- Use `this.assign(input)` in constructor for initialization
- Fields have default values
- Fields use **snake_case** names

### Error pattern

- Custom errors extend `Error`
- Set `this.name` in constructor
- Provide a default message

---

## 7. Code Practices

- **No `var`** — use `const` by default, `let` when reassignment is needed
- **No unused variables** — prefix with `_` if intentionally unused (e.g., `_target`)
- **Prefer `const` assertions** — use `as const` for literal types
- **No `console.log`** — use the `logger` from `src/config/logger.ts` (pino)
- **Use `void` prefix** for floating promises — `void main()` at entry point
- **Arrow functions** — prefer arrow functions for callbacks and short expressions
- **Async/await** — use `async`/`await` over raw promise chains
- **Error handling** — always `catch` and handle errors; use typed error classes
- **Early returns** — prefer guard clauses over nested `if` blocks
- **Explicit visibility modifiers** — use `public`, `private`, `protected`, `readonly` on class
  members
- **No magic numbers** — extract to named constants in `config/constants.ts`

---

## 8. Testing

- Framework: **Vitest**
- Test files: `*.spec.ts`, co-located with source
- Imports: `describe`, `it`, `expect`, `vi`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
  from `vitest`
- Test structure: `describe(ClassName.name, () => { ... })` using the class reference for the
  describe block name
- Database tests: use `mongodb-memory-server` for in-memory MongoDB
- Assertions: use Vitest `expect` matchers (`toBe`, `toBeDefined`, `toEqual`, `toHaveBeenCalled`,
  etc.)
- Mocking: use `vi.spyOn()` for spying, `vi.fn()` for mock functions
- Run: `pnpm test` (single run), `pnpm test:watch` (watch mode), `pnpm test:cov` (coverage),
  `pnpm test:mutate` (mutation testing with Stryker)

---

## 9. Validation Checklist

Before submitting code, ensure:

- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm build:check` passes (TypeScript type check)
- [ ] `pnpm test` passes
- [ ] Import order follows the rules in section 2
- [ ] No semicolons, single quotes, 2-space indentation
- [ ] Brace style is Stroustrup (`else`/`catch`/`finally` on new line)
- [ ] File names follow the `kebab-case.suffix.ts` convention
- [ ] Classes, enums, and types follow PascalCase naming
- [ ] New files are added to the appropriate barrel `index.ts`
- [ ] Test files are co-located with their source
