# PDF Studio Bot

[![Telegram](https://img.shields.io/badge/Telegram-PDF%20Studio%20Bot-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge)](https://t.me/PDFStudio_bot)
[![Website](https://img.shields.io/badge/Website-PDF%20Studio%20Bot-blue?style=for-the-badge)](https://pdfstudio.gabrielrufino.com/)

Your ultimate assistant for PDF management is now on Telegram!
Try it now and experience the convenience: just click the button above 🚀

## ✨ Features

- **📥 Download PDFs from URL**
  Convert any webpage, article, or documentation URL into a clean A4 PDF file.

- **🔒 Add Password to PDF**
  Protect your confidential documents by encrypting any PDF file with a password.

- **🔓 Remove Password from PDF**
  Decrypt and remove password protection from your PDF files with ease.

- **📄 Split PDFs into Individual Pages**
  Break down multi-page PDFs into separate files, one page at a time.

- **🔄 Rotate PDFs**
  Rotate your PDF files by 90, 180, or -90 degrees.

- **📎 Merge / Join PDFs**
  Send multiple PDF files (up to 10 files) and merge them into a single document.

- **🖼️ Convert PDF to Images**
  Extract and convert PDF pages into high-resolution images (PNG) sent directly to your chat.

- **📝 AI-Powered Summary**
  Get concise, structured summaries of your PDF documents powered by Google Gemini AI.

- **🌐 Multi-Language Support**
  Available in English, Portuguese, and Spanish with seamless in-app switching.

- **💎 PRO Subscription**
  Upgrade to PRO via Telegram Stars to get higher daily limits (up to 50 operations/day).

- **💬 Feedback System**
  Share suggestions, feature requests, or report issues directly to the developer.

## 📢 Why use PDF Studio Bot?

- **Total convenience:** Handle everything directly from Telegram, no installations required!
- **Instant results:** Send your PDF, choose an action, and receive your result within seconds.
- **Privacy and security:** Your files are processed securely with automatic cleanup.
- **Free and easy to use:** No registration or complicated setup needed.

## 💡 Who is it for?

- Professionals dealing with confidential documents
- Students, researchers, and teachers
- Businesses seeking to secure or automate their PDFs
- Anyone who wants to protect and manage their files easily

## 🤖 Available Commands

- `/start` - Start using the bot and view the welcome guide
- `/help` - Show the interactive list of available commands and operations
- `/download` - Download and convert a webpage URL into a PDF
- `/join` - Join multiple PDF files into a single document
- `/split` - Split a PDF into individual pages
- `/rotate` - Rotate a PDF file by a specified degree
- `/pdftoimages` - Convert PDF pages to high-quality images
- `/putpassword` - Protect a PDF with a password
- `/removepassword` - Remove password protection from a PDF
- `/summary` - Generate an AI summary of a PDF document
- `/language` - Change bot language (English, Portuguese, Spanish)
- `/pro` - Upgrade to PRO plan with Telegram Stars
- `/feedback` - Send us your feedback and suggestions
- `/version` - Show the bot version and developer info

## 🏗️ Tech Stack

- **TypeScript** - Type-safe development
- **grammY** - Modern Telegram Bot framework
- **@grammyjs/runner** - Concurrent update processing
- **Google GenAI** - Google Gemini AI for document summarization
- **MongoDB** - Database for users, configurations, and feedback
- **Muhammara** - PDF manipulation and encryption library
- **Puppeteer** - Headless browser for URL-to-PDF conversion
- **pdf-to-img** - PDF to image conversion
- **Pino** - High-performance logging
- **Vitest** - Fast unit testing framework

## 📦 Project Structure

```
src/
├── config/          # Configuration files (ai, bot, browser, database, logger)
├── decorators/      # Decorators (initialization check)
├── entities/        # Data models (User, Feedback, Payment, Configuration, Message, Event)
├── enums/           # Enumerations (Commands, Languages, Plans, Currencies, Events)
├── errors/          # Custom error classes
├── handlers/        # Command handlers with business logic
├── interfaces/      # TypeScript interfaces
├── jobs/            # Scheduled background jobs (cron)
├── locales/         # i18n translation files (en, pt, es)
├── messages/        # Bot message templates
├── middlewares/     # Middlewares (i18n, rate limiting, authentication)
├── repositories/    # Data access layer
├── schemas/         # Zod validation schemas
└── types/           # Custom TypeScript types
```

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Run in development mode with hot reload
pnpm start:dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## 🧪 Testing

The project uses Vitest for unit testing with comprehensive test coverage for:
- Handlers (command processing logic)
- Repositories (database operations)
- Messages (response templates)

Run tests with:
```bash
pnpm test          # Run all tests
pnpm test:cov      # Run with coverage report
pnpm test:watch    # Watch mode for development
```

## 🛠️ Stay tuned!

New features are coming soon!
Follow the project and be the first to know when new PDF tools are available.
