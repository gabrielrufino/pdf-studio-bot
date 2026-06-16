import type { NextFunction } from 'grammy'
import type { CustomContext } from '../types/custom-context.type'
import { EventEntity } from '../entities/event.entity'
import { EventEnum } from '../enums/event.enum'
import { eventRepository } from '../repositories'

export async function eventRecorderMiddleware(ctx: CustomContext, next: NextFunction) {
  if (!ctx.from) {
    return next()
  }

  const events: EventEntity[] = []

  // Check for command
  if (ctx.message?.text?.startsWith('/')) {
    events.push(new EventEntity({
      event: EventEnum.CommandSent,
      telegram_user: ctx.from,
      metadata: { command: ctx.message.text },
    }))
  }

  // Check for callback query (button click)
  if (ctx.callbackQuery) {
    events.push(new EventEntity({
      event: EventEnum.ButtonClicked,
      telegram_user: ctx.from,
      metadata: { data: ctx.callbackQuery.data },
    }))
  }

  // Check for file document received
  if (ctx.message?.document) {
    events.push(new EventEntity({
      event: EventEnum.FileReceived,
      telegram_user: ctx.from,
      metadata: { mime_type: ctx.message.document.mime_type },
    }))
  }

  if (events.length > 0) {
    // Fire and forget to not block the request
    Promise.all(events.map(event => eventRepository.create(event))).catch(() => {})
  }

  return next()
}
