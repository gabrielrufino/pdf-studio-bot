# AGENTS.md

## Commands
- **Package Manager**: Strictly `pnpm` (never `npm`, `yarn`, or `bun`).
- **Install**: `pnpm install`
- **Development**: `pnpm start:dev` (requires `.env`, uses `tsx watch`)
- **Build**: `pnpm build` (`tsdown`)
- **Typecheck**: `pnpm build:check` (`tsc --noEmit`)
- **Lint**: `pnpm lint` (`eslint ./src`)
- **Test**: `pnpm test` (`vitest run`)
- **Single Test**: `pnpm vitest run src/path/to/file.spec.ts`
- **Coverage**: `pnpm test:cov`

## Verification Order
Run in this sequence before completion:
1. `pnpm lint`
2. `pnpm build:check`
3. `pnpm test`

## Architecture & Code Conventions
- **Entrypoint**: `src/index.ts`
- **Barrel Files**: Every directory under `src/` requires an `index.ts` re-exporting public symbols.
- **Handlers**: Extend `BaseHandler`, implement `onCommand()`.
- **Repositories**: Extend `BaseRepository<T>`, use `@EnsureInitialized` on DB methods.
- **Tests**: Co-located with source files as `<name>.spec.ts`. Uses `mongodb-memory-server` for DB integration tests.
- **Formatting**: Single quotes, NO semicolons, 2 spaces, Stroustrup brace style (`else`, `catch`, `finally` on new lines).
- **TypeScript**: Strict mode, no `any`, no non-null assertions (`!`), always use `import type` for type-only imports.
- **Logging**: Use `logger` from `src/config/logger.ts`, never `console.log`.
