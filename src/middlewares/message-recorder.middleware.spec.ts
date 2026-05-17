import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { messageRepository } from '../repositories'
import { messageRecorderMiddleware } from './message-recorder.middleware'

vi.mock('../repositories', () => ({
  messageRepository: {
    create: vi.fn(),
  },
}))

describe(messageRecorderMiddleware.name, () => {
  let next: any
  let ctx: any

  beforeEach(() => {
    next = vi.fn()
    ctx = { t: (key: string) => key,
      from: { id: 12345 },
      message: { text: 'hello' },
      session: { command: null },
    }
    vi.clearAllMocks()
  })

  it('should create a message record and call next', async () => {
    await messageRecorderMiddleware(ctx, next)

    expect(messageRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      text: 'hello',
      telegram_user: ctx.from,
    }))
    expect(next).toHaveBeenCalled()
  })

  it('should mask password text if command is PutPassword', async () => {
    ctx.session.command = CommandEnum.PutPassword
    ctx.message.text = 'secret123'

    await messageRecorderMiddleware(ctx, next)

    expect(messageRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      text: '***',
      telegram_user: ctx.from,
    }))
    expect(next).toHaveBeenCalled()
  })

  it('should handle missing message text', async () => {
    ctx.message.text = undefined

    await messageRecorderMiddleware(ctx, next)

    expect(messageRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      text: '',
    }))
    expect(next).toHaveBeenCalled()
  })

  it('should call next and do nothing if no message in context', async () => {
    ctx.message = undefined

    await messageRecorderMiddleware(ctx, next)

    expect(messageRepository.create).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})
