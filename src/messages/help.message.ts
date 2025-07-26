import type { Message } from '../interfaces/message'

export class HelpMessage implements Message {
  public build() {
    return `
/help - Show this message

/download - Download a PDF from a URL
/putpassword - Protects the PDF with a password
`
  }
}
