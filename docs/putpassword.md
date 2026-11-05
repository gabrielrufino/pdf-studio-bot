# PutPassword

## Overview

The `/putpassword` command encrypts a PDF with a user-provided password.

## Business Rules

- User sends the PDF first, then sends the desired password as a text message.
- The password message is deleted after processing to reduce exposure in the chat.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as PutPasswordHandler

    U->>B: /putpassword
    B->>H: onCommand
    H->>U: putpassword_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF
    H->>H: download and store path in session.params
    H->>U: putpassword_send_password

    U->>B: password text
    B->>H: events.msg:text
    H->>H: delete password message
    H->>H: incrementUsage
    H->>U: putpassword_processing
    H->>H: encrypt PDF with muhammara Recipe
    H->>U: replyWithDocument output.pdf
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /putpassword
    AwaitingFile --> AwaitingPassword : PDF valid
    AwaitingFile --> Error : invalid PDF
    AwaitingPassword --> Processing : password received
    Processing --> Success : encrypted file sent
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `PutPasswordHandler` extends `PasswordBaseHandler`.
- Encryption uses `muhammara.Recipe(...).encrypt({ userPassword: password }).endPDF()`.
- Base class handles session state, validation, and cleanup.
