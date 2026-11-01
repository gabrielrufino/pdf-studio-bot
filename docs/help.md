# Help

## Overview

The `/help` command displays an interactive menu with all available commands. Users can tap a button to invoke a command directly.

## Business Rules

- No usage limit is consumed.
- The menu is generated dynamically from the registered handlers list.
- Tapping a button deletes the help message and triggers the selected command.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as HelpHandler

    U->>B: /help
    B->>H: onCommand
    H->>H: build HelpMessage
    B->>U: reply with inline keyboard

    alt user taps a command button
        U->>B: callback_query
        B->>H: events.callback_query
        H->>H: find handler by command
        H->>B: delete help message
        H->>TargetHandler: onCommand
    end
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> MenuDisplayed : /help
    MenuDisplayed --> CommandInvoked : button tap
    CommandInvoked --> [*]
    MenuDisplayed --> [*] : message ignored
```

## Technical Notes

- Handler: `HelpHandler` receives the full handler array and includes itself.
- Buttons use `InlineKeyboard` with command names as callback data.
- Unknown buttons are answered with `answerCallbackQuery` at the bot level in `src/index.ts`.
