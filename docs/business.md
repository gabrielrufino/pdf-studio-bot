# Business Overview

## Value Proposition

PDF Studio Bot is a Telegram-based assistant for common PDF operations. Users send files or URLs and receive processed documents directly in the chat, without installing software.

## Target Personas

- **Professionals** handling confidential documents (password protection, compression).
- **Students and educators** splitting, joining, or extracting pages from academic PDFs.
- **Businesses** automating simple PDF workflows.
- **General users** who need quick PDF conversions on mobile.

## Feature Catalog

| Command | Free | PRO | Description |
|---------|------|-----|-------------|
| `/start` | Yes | Yes | Onboarding and welcome message. |
| `/help` | Yes | Yes | Interactive command menu. |
| `/language` | Yes | Yes | Switch between English, Portuguese, Spanish. |
| `/download` | Yes | Yes | Convert a webpage or PDF URL into a PDF. |
| `/compress` | Yes | Yes | Reduce PDF file size using object streams. |
| `/join` | Yes | Yes | Merge up to 10 PDF files. |
| `/split` | Yes | Yes | Split each page into a separate file. |
| `/extract` | Yes | Yes | Extract a specific page range. |
| `/rotate` | Yes | Yes | Rotate by 90°, 180°, or -90°. |
| `/pdftoimages` | Yes | Yes | Convert pages to PNG images. |
| `/extracttext` | Yes | Yes | Extract text to a TXT file. |
| `/putpassword` | Yes | Yes | Encrypt a PDF with a password. |
| `/removepassword` | Yes | Yes | Decrypt a password-protected PDF. |
| `/pro` | Yes | Yes | Upgrade to PRO via Telegram Stars. |
| `/feedback` | Yes | Yes | Send feedback to the developer. |
| `/version` | Yes | Yes | Show current bot version. |

## Monetization

- **Free tier**: 3 PDF operations per day, up to 10 MB and 50 pages per file.
- **PRO tier**: 50 operations per day, up to 50 MB and 1,000 pages per file.
- **Payment**: one-time subscription purchased with Telegram Stars (XTR) through Telegram's native payment flow.
- **Subscription duration**: 30 days. After expiration the user falls back to the free tier automatically.

## Usage Limits

See [usage-limits.md](./usage-limits.md) for the technical enforcement of free and PRO limits.

## Retention

A weekly cron job identifies users inactive for 30 days and sends a re-engagement message. See [reengagement.md](./reengagement.md).

## Feedback Loop

Users can send free-text feedback via `/feedback`. Each message is stored in MongoDB for review.

## Privacy and Security Selling Points

- Files are processed in temporary directories and removed after delivery or failure.
- URL downloads block private/internal IP addresses to mitigate SSRF.
- Sensitive tokens are redacted from logs.
- No user file is retained after the operation ends.
