# Feedback

## Overview

The `/feedback` command lets users send free-text suggestions or bug reports directly to the developer.

## Business Rules

- No usage limit is consumed.
- Each feedback is stored with the sender's Telegram user info and timestamp.
- The session is reset after the message is saved.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant R as FeedbackRepository

    U->>B: /feedback
    B->>U: feedback_send_message
    U->>B: text message
    B->>R: create FeedbackEntity
    R-->>B: saved
    B->>U: feedback_success
    B->>B: resetSession
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingMessage : /feedback
    AwaitingMessage --> Saved : text received
    Saved --> [*]
```

## Technical Notes

- Handler: `FeedbackHandler`.
- Stores `telegram_user`, `text`, and `created_at` in the `feedbacks` collection.
