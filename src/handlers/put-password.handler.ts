import { Recipe } from 'muhammara'
import { CommandEnum } from '../enums/command.enum'
import { PasswordBaseHandler } from './password-base.handler'

export class PutPasswordHandler extends PasswordBaseHandler {
  public readonly command = CommandEnum.PutPassword
  public readonly description = '🔐 Protect a PDF with a password'
  protected readonly prefix = 'putpassword'

  protected async processPDF(input: string, output: string, password?: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      new Recipe(input, output)
        .encrypt({
          userPassword: password,
        })
        .endPDF((err?: Error) => {
          if (err) {
            return reject(err)
          }
          resolve()
        })
    })
  }
}
