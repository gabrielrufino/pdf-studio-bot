# Start

## Overview

The `/start` command is the entry point for new and returning users. It creates a user record on first use and refreshes the profile on subsequent visits.

## Business Rules

- No usage limit is consumed.
- The welcome message is the first touchpoint for onboarding.
- Language is inferred from the Telegram client's `language_code` when supported; otherwise it defaults to English.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant R as UserRepository

    U->>B: /start
    B->>B: resetSession
    alt user does not exist
        B->>R: create UserEntity
        R-->>B: user created
        B->>B: set session.language
    else user exists
        B->>R: updateById
    end
    B->>U: WelcomeMessage
```

## State Machine

`/start` is a single-step command with no multi-turn state.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> WelcomeShown : /start
    WelcomeShown --> [*]
```

## Technical Notes

- Handler: `StartHandler` extends `BaseHandler` with `hasUsageLimits = false`.
- New users are persisted with `telegram_user`, `language`, and default free plan fields.
- Existing users are updated to keep the profile in sync.
