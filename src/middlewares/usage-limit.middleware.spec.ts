import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { userRepository } from '../repositories'
import { usageLimitMiddleware } from './usage-limit.middleware'

vi.mock('../repositories', () => ({
  userRepository: {
    findByTelegramId: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
  },
}))

describe(usageLimitMiddleware.name, () => {
  let next: any
  let ctx: any
  let handler: any

  beforeEach(() => {
    next = vi.fn()
    ctx = {
      from: { id: 12345 },
      reply: vi.fn(),
    }
    handler = {
      hasUsageLimits: true,
    }
    vi.clearAllMocks()
  })

  it('should call next if handler does not have usage limits', async () => {
    handler.hasUsageLimits = false
    const middleware = usageLimitMiddleware(handler)

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
  })

  it('should create user and increment usage if user does not exist', async () => {
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(null)
    const newUser = {
      _id: 'new-id',
      plan_type: PlanTypeEnum.Free,
      daily_usage_count: 0,
      last_usage_date: undefined,
    }
    vi.mocked(userRepository.create).mockResolvedValueOnce(newUser as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.create).toHaveBeenCalled()
    expect(userRepository.updateById).toHaveBeenCalledWith('new-id', expect.objectContaining({
      daily_usage_count: 1,
      last_usage_date: expect.any(String),
    }))
    expect(next).toHaveBeenCalled()
  })

  it('should reset count if day has changed', async () => {
    const oldUser = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      daily_usage_count: 3,
      last_usage_date: '2000-01-01',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(oldUser as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.updateById).toHaveBeenCalledWith('user-id', expect.objectContaining({
      daily_usage_count: 1,
      last_usage_date: new Date().toISOString().split('T')[0],
    }))
    expect(next).toHaveBeenCalled()
  })

  it('should block if Free user reaches limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      daily_usage_count: 3,
      last_usage_date: new Date().toISOString().split('T')[0],
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('reached your daily limit of 3 operations'))
    expect(next).not.toHaveBeenCalled()
    expect(userRepository.updateById).not.toHaveBeenCalled()
  })

  it('should block if Pro user reaches limit (50)', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      daily_usage_count: 50,
      last_usage_date: new Date().toISOString().split('T')[0],
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('reached your daily limit of 50 operations'))
    expect(next).not.toHaveBeenCalled()
  })

  it('should allow if Pro user is within limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      daily_usage_count: 10,
      last_usage_date: new Date().toISOString().split('T')[0],
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(userRepository.updateById).toHaveBeenCalled()
  })
})
