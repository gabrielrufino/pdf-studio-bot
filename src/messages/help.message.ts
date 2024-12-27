import { Message } from '../interfaces/message';

export class HelpMessage implements Message {
  public build() {
    return `
/putpassword - Protects the PDF with a password
/help - Show this message
`;
  }
}
