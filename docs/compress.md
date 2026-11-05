# Compress

## Overview

The `/compress` command reduces PDF file size by rewriting the document with object streams enabled.

## Business Rules

- Only valid PDF documents are accepted.
- If compression does not reduce the file size, the user is informed instead of receiving a larger file.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as CompressHandler

    U->>B: /compress
    B->>H: onCommand
    H->>U: compress_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF + checkLimits
    H->>H: incrementUsage
    H->>U: compress_compressing
    H->>H: load with pdf-lib and save with object streams
    alt size reduced
        H->>U: replyWithDocument compressed.pdf
    else no reduction
        H->>U: compress_no_reduction
    end
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /compress
    AwaitingFile --> Validating : PDF received
    Validating --> Processing : limits OK
    Validating --> Error : invalid PDF or limit exceeded
    Processing --> Success : size reduced
    Processing --> NoReduction : no size reduction
    Success --> [*]
    NoReduction --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `CompressHandler`.
- Uses `PDFDocument.load` and `pdfDoc.save({ useObjectStreams: true })` from `pdf-lib`.
- `BaseHandler.processDocument` manages validation, limits, download, usage accounting, and cleanup.
