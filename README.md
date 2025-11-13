# PDF Studio Bot

[![Telegram](https://img.shields.io/badge/Telegram-PDF%20Studio%20Bot-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge)](https://t.me/PDFStudio_bot)

Your ultimate assistant for PDF management is now on Telegram!
Try it now and experience the convenience: just click the button above 🚀

## ✨ Features

- **� Download PDFs from URL**
  Simply send a URL and get your PDF file instantly!

- **�🔒 Add password to your PDF**
  Protect your documents easily by adding a password to any PDF file — directly via Telegram, with just a few taps!

- **📄 Split PDFs into individual pages**
  Break down multi-page PDFs into separate files, one page at a time!

- **💬 Feedback system**
  Share your thoughts and suggestions to help us improve!

- **Convert PDFs to other formats (TXT, DOCX, images, etc.)**
  _Coming soon!_

- **Extract text and images**
  _Coming soon!_

- **Merge PDFs**
  _Coming soon!_

- **Compress files and batch processing**
  _Coming soon!_

## 📢 Why use PDF Studio Bot?

- **Total convenience:** Handle everything directly from Telegram, no installations required!
- **Instant results:** Send your PDF, choose an action, and receive your result within seconds.
- **Privacy and security:** Your files are processed with care and confidentiality.
- **Free and easy to use:** No registration or complicated setup needed.

## 💡 Who is it for?

- Professionals dealing with confidential documents
- Students and teachers
- Businesses seeking to secure or automate their PDFs
- Anyone who wants to protect and manage their files easily

## 🤖 Available Commands

- `/start` - Initialize the bot and register your user
- `/help` - Show all available commands
- `/download` - Download a PDF from a URL
- `/putpassword` - Protect your PDF with a password
- `/split` - Split PDF into individual pages
- `/feedback` - Send us your feedback and suggestions
- `/version` - Check the current bot version

## 🏗️ Tech Stack

- **TypeScript** - Type-safe development
- **Grammy** - Modern Telegram Bot framework
- **@grammyjs/runner** - Concurrent update processing
- **MongoDB** - Database for users and feedback
- **Muhammara** - PDF manipulation library
- **Puppeteer** - Web scraping and PDF downloads
- **Pino** - High-performance logging
- **Vitest** - Fast unit testing framework

## 📦 Project Structure

```
src/
├── config/          # Configuration files (bot, database, logger)
├── decorators/      # Custom decorators
├── entities/        # Data models (User, Feedback, Message)
├── enums/           # Enumerations (Commands)
├── handlers/        # Command handlers with business logic
├── interfaces/      # TypeScript interfaces
├── messages/        # Bot message templates
├── repositories/    # Data access layer
└── types/           # Custom TypeScript types
```

## 🚀 Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🧪 Testing

The project uses Vitest for unit testing with comprehensive test coverage for:
- Handlers (command processing logic)
- Repositories (database operations)
- Messages (response templates)

Run tests with:
```bash
npm test          # Run all tests
npm run test:cov  # Run with coverage report
npm run test:watch # Watch mode for development
```

## 🛠️ Stay tuned!

New features are coming soon!
Follow the project and be the first to know when new PDF tools are available.
