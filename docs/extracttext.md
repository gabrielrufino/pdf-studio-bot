# ExtractText

## Overview

The `/extracttext` command extracts the text content of a PDF and returns it as a `.txt` file.

## Business Rules

- Only valid PDF documents are accepted.
- File size is validated against plan limits.
- If the PDF contains no extractable text, the result file may be empty.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as ExtractTextHandler

    U->>B: /extracttext
    B->>H: onCommand
    H->>U: extracttext_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF + checkLimits(fileSize)
    H->>H: incrementUsage
    H->>U: extracttext_extracting
    H->>H: parse PDF text with pdf-parse
    H->>H: write text to temp .txt file
    H->>U: replyWithDocument extracted-text.txt
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /extracttext
    AwaitingFile --> Validating : PDF received
    Validating --> Processing : limits OK
    Validating --> Error : invalid PDF or limit exceeded
    Processing --> Success : TXT sent
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `ExtractTextHandler`.
- Uses `pdf-parse` to extract text content.
- The output text is written to a temporary `.txt` file and sent with `InputFile`.
