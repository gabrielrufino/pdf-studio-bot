# PdfToImages

## Overview

The `/pdftoimages` command converts each page of a PDF into a PNG image. Images are sent in groups of up to 10 per message to reduce chat clutter.

## Business Rules

- Only valid PDF documents are accepted.
- Total page count is validated against plan limits.
- Images are sent as a media group when there are multiple pages.
- A 1-second delay is applied between chunks to respect Telegram rate limits.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as PdfToImagesHandler

    U->>B: /pdftoimages
    B->>H: onCommand
    H->>U: pdftoimages_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF + checkLimits(fileSize)
    H->>H: download PDF
    H->>H: read total pages
    H->>H: checkLimits(pagesCount)
    H->>H: incrementUsage
    H->>U: pdftoimages_converting
    H->>H: convert pages to PNG
    loop every 10 images
        H->>U: sendMediaGroup or replyWithPhoto
        H->>H: sleep 1s
    end
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /pdftoimages
    AwaitingFile --> Validating : PDF received
    Validating --> Processing : limits OK
    Validating --> Error : invalid PDF or limit exceeded
    Processing --> SendingImages : convert pages
    SendingImages --> Success : all images sent
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `PdfToImagesHandler`.
- Uses `pdf-to-img` to render pages as PNG buffers.
- `sendImageChunks` groups images into chunks of 10 and sends them via `sendMediaGroup` or `replyWithPhoto`.
- Output directory and input file are removed after processing.
