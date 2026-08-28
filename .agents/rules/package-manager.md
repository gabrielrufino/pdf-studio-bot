---
trigger: always_on
description: Package manager rule enforcing pnpm usage across the project.
---

# Package Manager

This project exclusively uses **pnpm** as its package manager.

## Rules & Guidelines

- **Always use `pnpm`**: Never use `npm`, `yarn`, or `bun` for installing packages, managing dependencies, or running commands.
- **Installing Dependencies**:
  - Add a dependency: `pnpm add <package>`
  - Add a development dependency: `pnpm add -D <package>`
  - Install project dependencies: `pnpm install`
  - Remove a dependency: `pnpm remove <package>`
- **Running Scripts**:
  - Use `pnpm <script>` or `pnpm run <script>` (e.g., `pnpm test`, `pnpm lint`, `pnpm build`).
- **Lockfile Integrity**:
  - Keep `pnpm-lock.yaml` updated and committed.
  - Never generate or commit `package-lock.json`, `yarn.lock`, or `bun.lockb`.
