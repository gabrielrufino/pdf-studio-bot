import type { Message } from '../interfaces/message'

export class HelpMessage implements Message {
  public build() {
    return `
/help - Show this message
/feedback - Send us your feedback
/version - Show the bot version

/download - Download a PDF from a URL
/putpassword - Protects the PDF with a password
/split - Splits the PDF into individual pages
`
  }
}
