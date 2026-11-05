# Version

## Overview

The `/version` command displays the current bot version and developer information.

## Business Rules

- No usage limit is consumed.
- The version is read from `package.json`.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant P as package.json

    U->>B: /version
    B->>P: read version
    P-->>B: version string
    B->>U: version_info (HTML)
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> ShowingVersion : /version
    ShowingVersion --> [*]
```

## Technical Notes

- Handler: `VersionHandler`.
- Uses `formatString` to inject the version into the localized message.
- Message is sent with `parse_mode: 'HTML'`.
