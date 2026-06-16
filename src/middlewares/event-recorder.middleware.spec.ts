import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEnum } from '../enums/event.enum'
import { eventRepository } from '../repositories'
import { eventRecorderMiddleware } from './event-recorder.middleware'

vi.mock('../repositories', () => ({
  eventRepository: {
    create: vi.fn(),
  },
}))

describe('eventRecorderMiddleware', () => {
  const next = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call next if ctx.from is missing', async () => {
    const ctx: any = {}
    await eventRecorderMiddleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(eventRepository.create).not.toHaveBeenCalled()
  })

  it('should record CommandSent if message text starts with /', async () => {
    const ctx: any = {
      from: { id: 123 },
      message: { text: '/start' },
    }
    await eventRecorderMiddleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(eventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      event: EventEnum.CommandSent,
      telegram_user: { id: 123 },
      metadata: { command: '/start' },
    }))
  })

  it('should record ButtonClicked if callbackQuery exists', async () => {
    const ctx: any = {
      from: { id: 123 },
      callbackQuery: { data: 'some_data' },
    }
    await eventRecorderMiddleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(eventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      event: EventEnum.ButtonClicked,
      telegram_user: { id: 123 },
      metadata: { data: 'some_data' },
    }))
  })

  it('should record FileReceived if document is present', async () => {
    const ctx: any = {
      from: { id: 123 },
      message: { document: { mime_type: 'application/pdf' } },
    }
    await eventRecorderMiddleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(eventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      event: EventEnum.FileReceived,
      telegram_user: { id: 123 },
      metadata: { mime_type: 'application/pdf' },
    }))
  })

  it('should not record anything if no relevant update', async () => {
    const ctx: any = {
      from: { id: 123 },
      message: { text: 'hello' },
    }
    await eventRecorderMiddleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(eventRepository.create).not.toHaveBeenCalled()
  })
})
