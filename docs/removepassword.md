# RemovePassword

## Overview

The `/removepassword` command removes password protection from a PDF, given the current password.

## Business Rules

- User sends the password-protected PDF first, then sends the current password.
- The password message is deleted before processing (best-effort; processing continues if deletion fails).
- If the password is incorrect, processing fails and the user receives an error.
- Consumes one daily operation.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant H as RemovePasswordHandler

    U->>B: /removepassword
    B->>H: onCommand
    H->>U: removepassword_send_file
    U->>B: PDF document
    B->>H: events.msg:document
    H->>H: validatePDF
    H->>H: download and store path in session.params
    H->>U: removepassword_send_password

    U->>B: password text
    B->>H: events.msg:text
    H->>H: delete password message
    H->>H: incrementUsage
    H->>U: removepassword_processing
    H->>H: decrypt PDF with muhammara
    H->>U: replyWithDocument output.pdf
    H->>H: resetSession + cleanup
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> AwaitingFile : /removepassword
    AwaitingFile --> AwaitingPassword : PDF valid
    AwaitingFile --> Error : invalid PDF
    AwaitingPassword --> Processing : password received
    Processing --> Success : decrypted file sent
    Processing --> Error : wrong password
    Success --> [*]
    Error --> [*]
```

## Technical Notes

- Handler: `RemovePasswordHandler` extends `PasswordBaseHandler`.
- Decryption uses `muhammara.createWriter(output).appendPDFPagesFromPDF(input, { password })`.
- The writer is closed safely even when decryption fails.
