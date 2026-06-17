import type { NextFunction } from 'grammy'
import type { CustomContext } from '../types/custom-context.type'
import { logger } from '../config/logger'
import { EventEntity } from '../entities/event.entity'
import { CommandEnum } from '../enums/command.enum'
import { EventEnum } from '../enums/event.enum'
import { eventRepository } from '../repositories'

export async function eventRecorderMiddleware(ctx: CustomContext, next: NextFunction) {
  if (!ctx.from) {
    return next()
  }

  const events: EventEntity[] = []

  // Check for command
  if (ctx.message?.text?.startsWith('/')) {
    const rawCommand = ctx.message.text.split(' ')[0]!.substring(1)
    const match = Object.entries(CommandEnum).find(([, value]) => value === rawCommand)

    if (match) {
      const enumKey = match[0] as keyof typeof CommandEnum
      const eventValue = EventEnum[`Command${enumKey}` as keyof typeof EventEnum]
      if (eventValue) {
        events.push(new EventEntity({
          event: eventValue,
          telegram_user: ctx.from,
        }))
      }
    }
  }

  // Check for callback query (button click)
  if (ctx.callbackQuery?.data) {
    const rawData = ctx.callbackQuery.data
    const match = Object.entries(CommandEnum).find(([, value]) => value === rawData)

    if (match) {
      const enumKey = match[0] as keyof typeof CommandEnum
      const eventValue = EventEnum[`Button${enumKey}` as keyof typeof EventEnum]
      if (eventValue) {
        events.push(new EventEntity({
          event: eventValue,
          telegram_user: ctx.from,
        }))
      }
    }
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
    Promise.all(events.map(event => eventRepository.create(event))).catch((error) => {
      logger.error({ error }, 'Failed to record events')
    })
  }

  return next()
}
