import type { BaseHandler } from '../handlers/base.handler'
import type { CustomContext } from '../types/custom-context.type'
import { InlineKeyboard } from 'grammy'
import { CommandEnum } from '../enums/command.enum'

export class HelpMessage {
  private static readonly OPERATIONS = new Set<string>([
    CommandEnum.Download,
    CommandEnum.Join,
    CommandEnum.PdfToImages,
    CommandEnum.PutPassword,
    CommandEnum.RemovePassword,
    CommandEnum.Split,
    CommandEnum.Summary,
    CommandEnum.Language,
  ])

  private static readonly INFORMATION = new Set<string>([
    CommandEnum.Pro,
    CommandEnum.Feedback,
    CommandEnum.Version,
    CommandEnum.Help,
  ])

  private static cache = new WeakMap<BaseHandler[], Record<string, { text: string, reply_markup: InlineKeyboard }>>()

  constructor(
    private readonly handlers: BaseHandler[],
    private readonly ctx: CustomContext,
  ) {}

  public build() {
    let handlersCache = HelpMessage.cache.get(this.handlers)
    if (!handlersCache) {
      handlersCache = {}
      HelpMessage.cache.set(this.handlers, handlersCache)
    }

    const language = this.ctx.session?.language || 'en'
    if (handlersCache[language]) {
      return handlersCache[language]
    }

    const keyboard = new InlineKeyboard()

    const operationHandlers = this.handlers.filter(h => HelpMessage.OPERATIONS.has(h.command))
    const informationHandlers = this.handlers.filter(h => HelpMessage.INFORMATION.has(h.command))

    const allHandlers = [...operationHandlers, ...informationHandlers]

    allHandlers.forEach((h) => {
      keyboard.text(this.ctx.t(`operation_${h.command}`), h.command).row()
    })

    const result = {
      text: this.ctx.t('help_select_operation'),
      reply_markup: keyboard,
    }

    handlersCache[language] = result

    return result
  }
}
