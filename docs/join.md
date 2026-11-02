# Join

## Overview

The `/join` command merges multiple PDF files into a single document. Users send files one by one and type `done` to trigger the merge.

## Business Rules

- Minimum of 2 files; maximum of 10 files.
- Each uploaded file must be a valid PDF.
- Each upload is validated against plan size limits.
- Consumes one daily operation when the merge is executed.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as JoinHandler

    U->>B: /join
    B->>H: onCommand
    H->>U: join_send_files (max 10)

    loop file upload
        U->>B: PDF document
        B->>H: events.msg:document
        H->>H: validatePDF + checkLimits
        H->>H: download and push path to session.params.paths
        H->>U: join_file_received (current/max)
    end

    U->>B: done
    B->>H: events.msg:text
    H->>H: joinPDFs
    H->>H: merge with muhammara
    H->>U: replyWithDocument merged.pdf
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> CollectingFiles : /join
    CollectingFiles --> CollectingFiles : PDF uploaded
    CollectingFiles --> Merging : done
    Merging --> Success : >= 2 files
    Merging --> TooFewFiles : < 2 files
    TooFewFiles --> CollectingFiles : prompt again
    Success --> [*]
```

## Technical Notes

- Handler: `JoinHandler`.
- Stores an array of downloaded file paths in `session.params.paths`.
- Merging uses `muhammara.createWriter` and `appendPDFPagesFromPDF`.
- Temporary output directory is removed in the `finally` block.
