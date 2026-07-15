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
        command_started_at: undefined,
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

  it('should deny new command if maintenance mode is on', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
      maintenance_timeout_minutes: 30,
    } as any)
    ctx.message.text = '/start'

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })

  it('should deny new interaction (callbackQuery) if maintenance mode is on', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
      maintenance_timeout_minutes: 30,
    } as any)
    ctx.callbackQuery = {}

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next if continuing ongoing operation within timeout', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
      maintenance_timeout_minutes: 30,
    } as any)
    ctx.session.command = 'some_command'
    ctx.session.command_started_at = Date.now() - 10 * 60 * 1000 // 10 minutes ago
    ctx.message.text = 'not a command'

    await maintenanceMiddleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should deny and reset session if continuing ongoing operation exceeds timeout', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
      maintenance_timeout_minutes: 30,
    } as any)
    ctx.session.command = 'some_command'
    ctx.session.command_started_at = Date.now() - 40 * 60 * 1000 // 40 minutes ago
    ctx.session.params = { foo: 'bar' }
    ctx.message.text = 'not a command'

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_timeout')
    expect(next).not.toHaveBeenCalled()
    expect(ctx.session.command).toBeNull()
    expect(ctx.session.params).toBeNull()
    expect(ctx.session.command_started_at).toBeUndefined()
  })

  it('should call next if continuing ongoing operation and command_started_at is not set (backwards compatibility)', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
      maintenance_timeout_minutes: 30,
    } as any)
    ctx.session.command = 'some_command'
    ctx.session.command_started_at = undefined
    ctx.message.text = 'not a command'

    await maintenanceMiddleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should deny interaction if no ongoing command and not a new command', async () => {
    vi.mocked(configurationRepository.findGlobalConfig).mockResolvedValueOnce({
      maintenance_mode: true,
      maintenance_timeout_minutes: 30,
    } as any)
    ctx.session.command = null
    ctx.message.text = 'just some text'

    await maintenanceMiddleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith('maintenance_mode_active')
    expect(next).not.toHaveBeenCalled()
  })
})
