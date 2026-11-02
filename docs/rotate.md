# Rotate

## Overview

The `/rotate` command rotates all pages of a PDF by 90°, 180°, or -90°.

## Business Rules

- User sends a PDF, then chooses the rotation angle from an inline keyboard.
- The rotation is relative to each page's current rotation.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as RotateHandler

    U->>B: /rotate
    B->>H: onCommand
    H->>U: rotate_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF
    H->>H: store file_id in session.params
    H->>U: rotate_choose_degrees (90, 180, -90)

    U->>B: tap angle button
    B->>H: events.callback_query
    H->>H: validateParams + checkLimits
    H->>H: incrementUsage
    H->>U: rotate_rotating
    H->>H: load PDF, rotate pages, save
    H->>U: replyWithDocument rotated.pdf
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /rotate
    AwaitingFile --> AwaitingAngle : PDF valid
    AwaitingFile --> Error : invalid PDF
    AwaitingAngle --> Processing : angle chosen
    Processing --> Success : file sent
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `RotateHandler`.
- Stores `file_id` instead of a local path because the file is downloaded after the angle is chosen.
- Uses `PDFDocument.load` and `page.setRotation(degrees(...))` from `pdf-lib`.
- Rotation is normalized to the `[0, 360)` range.
