import { Message } from "../interfaces/message";

export class WelcomeMessage implements Message {
  public build() {
    return `
Welcome to <b>PDF Studio</b>! 🎉📄

Here, you'll find all the tools you need to work with PDF files quickly and efficiently.

With PDF Studio, you can:
✨ Edit, split, or merge PDFs.
🔍 Convert files to and from PDF.
🔒 Secure your documents with passwords.
✏️ Fill out interactive forms, and much more!

We're here to make your PDF experience seamless. If you need assistance, just ask! 🚀

Ready to get started? 😃
`
  }
}
