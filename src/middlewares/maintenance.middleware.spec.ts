import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configurationRepository } from '../repositories'
import { maintenanceMiddleware } from './maintenance.middleware'

vi.mock('../repositories', () => ({
  configurationRepository: {
    findGlobalConfig: vi.fn(),
  },
}))

describe(maintenanceMiddleware.name, () => {
  let next: any
  let ctx: any

  beforeEach(() => {
    next = vi.fn()
    ctx = {
      t: (key: string) => key,
      reply: vi.fn(),
      session: {
        command: null,
        params: null,
      },
      message: {},
    }
    vi.clearAllMocks()
  })

  it('should call next if maintenance mode is off', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: false,
    } as any)

    await maintenanceMiddleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should call next if config is null', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce(null as any)

    await maintenanceMiddleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should deny new command if maintenance mode is on', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
    } as any)
    ctx.message.text = '/start'

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })

  it('should deny ongoing operation if maintenance mode is on', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
    } as any)
    ctx.session.command = 'some_command'
    ctx.message.text = 'not a command'

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })

  it('should deny callbackQuery if maintenance mode is on', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
    } as any)
    ctx.callbackQuery = {}

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })

  it('should deny plain text if maintenance mode is on', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
    } as any)
    ctx.message.text = 'just some text'

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })
})
