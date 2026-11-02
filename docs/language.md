# Language

## Overview

The `/language` command lets users switch the bot interface between English, Portuguese, and Spanish.

## Business Rules

- No usage limit is consumed.
- The change is persisted to the user profile and stored in the session.
- Unsupported Telegram language codes fall back to English.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant R as UserRepository

    U->>B: /language
    B->>U: reply with language buttons
    U->>B: tap language button
    B->>R: update user.language
    B->>B: update session.language
    B->>U: answerCallbackQuery + editMessageText
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> ChoosingLanguage : /language
    ChoosingLanguage --> LanguageChanged : valid button tap
    LanguageChanged --> [*]
    ChoosingLanguage --> [*] : invalid tap ignored
```

## Technical Notes

- Handler: `LanguageHandler`.
- Allowed languages are driven by `LanguageEnum`.
- Translations are loaded from `src/locales/{en,pt,es}.json` by `i18nMiddleware`.
