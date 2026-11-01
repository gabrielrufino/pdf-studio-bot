# Download

## Overview

The `/download` command converts a URL into a PDF. If the URL points directly to a `.pdf` file, the file is fetched and returned. Otherwise, the webpage is rendered with Puppeteer and printed to PDF.

## Business Rules

- URL must use `http:` or `https:`.
- Private IP addresses and internal networks are blocked to prevent SSRF.
- Direct PDF downloads are capped at 50 MB.
- Webpages are rendered as A4 PDFs with 1 cm margins.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant V as URL Validator
    participant P as Puppeteer / Fetch

    U->>B: /download
    B->>U: send_url prompt
    U->>B: URL text
    B->>V: parse and validate URL
    alt invalid URL
        V-->>B: SessionValidationError
        B->>U: download_error
    else valid URL
        B->>V: resolve hostname and check private IP
        alt private IP
            V-->>B: Error
            B->>U: download_error
        else public
            B->>P: fetch or render
            P-->>B: PDF bytes / file
            B->>U: replyWithDocument
        end
    end
```

## State Machine

```mermaid
flowchart TD
    A[User sends URL] --> B{Valid HTTP/HTTPS URL?}
    B -->|No| C[Reply download_error]
    B -->|Yes| D{Hostname is private IP?}
    D -->|Yes| C
    D -->|No| E{DNS resolves to private IP?}
    E -->|Yes| C
    E -->|No| F{Path ends with .pdf?}
    F -->|Yes| G[Fetch PDF with redirect limit]
    F -->|No| H[Render page with Puppeteer]
    G --> I{Size <= 50MB?}
    I -->|No| C
    I -->|Yes| J[Send document]
    H --> J
```

## Technical Notes

- Handler: `DownloadHandler` uses Puppeteer for HTML pages and `fetch` for direct PDFs.
- SSRF protection checks both the hostname and resolved DNS addresses with `ipaddr.js`.
- Request interception inside Puppeteer aborts requests to private IPs.
- Max redirects: 5. Fetch timeout: 30 seconds.
