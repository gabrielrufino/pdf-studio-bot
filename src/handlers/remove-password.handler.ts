import muhammara from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { PasswordBaseHandler } from './password-base.handler'

export class RemovePasswordHandler extends PasswordBaseHandler {
  public readonly command = CommandEnum.RemovePassword
  public readonly description = '🔓 Remove password from a PDF'
  protected readonly prefix = 'removepassword'

  protected async processPDF(input: string, output: string, password?: string): Promise<void> {
    const pdfWriter = muhammara.createWriter(output)
    try {
      pdfWriter.appendPDFPagesFromPDF(input, { password })
      pdfWriter.end()
    }
    catch (error) {
      try {
        pdfWriter.end()
      }
      catch (cleanupError) {
        this.logger.error({ error: cleanupError }, 'Failed to close PDF writer during cleanup.')
      }
      throw error
    }
  }
}
