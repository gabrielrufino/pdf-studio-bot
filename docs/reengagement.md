# Re-engagement Job

## Overview

A scheduled background job reminds inactive users to return to the bot. It runs weekly on Mondays at 09:00.

## Business Rules

- Target users who have not interacted for **30 days**.
- Exclude blocked users and users who have blocked the bot.
- Respect Telegram rate limits by sleeping 50 ms between messages.

## User Flow

```mermaid
sequenceDiagram
    participant Cron as Cron Scheduler
    participant Job as ReengagementJob
    participant Repo as UserRepository
    participant API as Telegram API
    Cron->>Job: Every Monday 09:00
    Job->>Repo: findInactiveUsers(30)
    Repo-->>Job: cursor of inactive users
    loop each inactive user
        Job->>API: sendMessage(reengagement_message)
        alt success
            API-->>Job: message sent
        else bot blocked (403)
            API-->>Job: error
            Job->>Repo: update is_bot_blocked = true
        else other error
            Job->>Job: log error
        end
        Job->>Job: sleep 50ms
    end
```

## Technical Notes

- Implemented in `src/jobs/reengagement.job.ts` using `node-cron`.
- Uses `UserRepository.findInactiveUsers(30)` to query the cursor.
- Sends the localized `reengagement_message` via `bot.api.sendMessage`.
- If the bot was blocked by the user (HTTP 403), marks `is_bot_blocked = true`.
