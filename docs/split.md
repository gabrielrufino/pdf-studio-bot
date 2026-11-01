# Split

## Overview

The `/split` command breaks a multi-page PDF into individual single-page PDF files, sending each as a separate document.

## Business Rules

- Only valid PDF documents are accepted.
- The total page count is validated against the user's plan limit.
- One file is sent per page with a 1-second delay between messages to avoid Telegram rate limits.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as SplitHandler

    U->>B: /split
    B->>H: onCommand
    H->>U: split_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF + checkLimits(fileSize)
    H->>H: download PDF
    H->>H: read page count
    H->>H: checkLimits(pagesCount)
    H->>H: incrementUsage
    H->>U: split_splitting
    loop each page
        H->>H: create single-page PDF
        H->>U: replyWithDocument
        H->>H: sleep 1s
    end
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /split
    AwaitingFile --> Validating : PDF received
    Validating --> Processing : limits OK
    Validating --> Error : invalid PDF or limit exceeded
    Processing --> SendingPages : split each page
    SendingPages --> Success : all pages sent
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `SplitHandler`.
- Uses `muhammara.createReader` to count pages and `muhammara.createWriter` to copy individual pages.
- Temporary input file and output directory are removed in the `finally` block.
