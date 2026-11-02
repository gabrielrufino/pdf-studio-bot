# Usage Limits

## Overview

The bot enforces daily usage limits based on the user's plan. Limits are checked by `usageLimitMiddleware` and accounted for by `BaseHandler.runWithUsage`.

## Plan Limits

| Plan | Daily Operations | Max File Size | Max Pages |
|------|------------------|---------------|-----------|
| Free | 3 | 10 MB | 50 |
| PRO | 50 | 50 MB | 1,000 |

PRO access lasts 30 days from the purchase date.

## Middleware Decision Flow

```mermaid
flowchart TD
    A[Request arrives] --> B{hasUsageLimits?}
    B -->|No| Z[Call next]
    B -->|Yes| C{User found?}
    C -->|No| D[Create user]
    C -->|Yes| E{PRO expired?}
    E -->|Yes| F[Downgrade to Free]
    E -->|No| G{User blocked?}
    D --> G
    F --> G
    G -->|Yes| H[Reply limit reached]
    G -->|No| I{Todays date = last_usage_date?}
    I -->|No| Z
    I -->|Yes| J{daily_usage_count < limit?}
    J -->|Yes| Z
    J -->|No| H
```

## Usage Increment

When a handler reserves an operation:

1. `incrementUsage` atomically checks the current date and counter.
2. If the counter is below the plan limit, it increments and returns the updated user.
3. If the limit is reached, it returns `null` and the handler notifies the user.

## Usage Decrement

If processing fails before delivery, `runWithUsage` decrements the counter so the failed attempt does not count against the daily quota.

## File and Page Limits

`BaseHandler.checkLimits` compares the incoming file size and PDF page count against plan-specific constants before processing begins.

```mermaid
flowchart TD
    A[PDF received] --> B{File size > plan limit?}
    B -->|Yes| C[Notify and throw LimitExceededError]
    B -->|No| D{Pages > plan limit?}
    D -->|Yes| C
    D -->|No| E[Continue processing]
```
