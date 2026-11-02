# Extract

## Overview

The `/extract` command extracts a contiguous range of pages from a PDF and returns a new file containing only those pages.

## Business Rules

- The user must first send the PDF, then send the range in the format `start-end` (e.g., `3-7`).
- Range bounds are validated against the actual page count.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as ExtractHandler

    U->>B: /extract
    B->>H: onCommand
    H->>U: extract_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF + checkLimits(fileSize)
    H->>H: download PDF
    H->>U: extract_send_range

    U->>B: text "3-7"
    B->>H: events.msg:text
    H->>H: parse and validate range
    H->>H: read total pages
    H->>H: checkLimits(pagesCount)
    H->>H: incrementUsage
    H->>U: extract_extracting
    H->>H: copy pages with muhammara
    H->>U: replyWithDocument extracted.pdf
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /extract
    AwaitingFile --> AwaitingRange : PDF valid
    AwaitingFile --> Error : invalid PDF or limit exceeded
    AwaitingRange --> Processing : valid range
    AwaitingRange --> InvalidRange : malformed or out of bounds
    InvalidRange --> Error : remove file, reset session, must restart
    Processing --> Success : file sent
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `ExtractHandler`.
- Stores the downloaded file path in `session.params.path` between turns.
- Uses `muhammara.createWriter` and `appendPDFPageFromPDF` to copy the selected pages.
- Input and output files are removed after processing.
