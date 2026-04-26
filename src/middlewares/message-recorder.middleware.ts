import type { NextFunction } from 'grammy'
import type { CustomContext } from '../types/custom-context.type'
import { MessageEntity } from '../entities/message.entity'
import { CommandEnum } from '../enums/command.enum'
import { messageRepository } from '../repositories'

export async function messageRecorderMiddleware(ctx: CustomContext, next: NextFunction) {
  if (ctx.message) {
    const isPassword = ctx.session.command === CommandEnum.PutPassword

    const message = new MessageEntity({
      text: isPassword ? '***' : (ctx.message.text || ''),
      telegram_user: ctx.from!,
    })

    await messageRepository.create(message)
  }

  return next()
}
