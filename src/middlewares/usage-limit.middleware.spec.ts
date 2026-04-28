import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { userRepository } from '../repositories'
import { usageLimitMiddleware } from './usage-limit.middleware'

vi.mock('../repositories', () => ({
  userRepository: {
    findByTelegramId: vi.fn(),
    create: vi.fn(),
    incrementUsage: vi.fn(),
    isWithinLimit: vi.fn(),
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
    vi.resetAllMocks()
  })

  it('should call next if handler does not have usage limits', async () => {
    handler.hasUsageLimits = false
    const middleware = usageLimitMiddleware(handler)

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
  })

  it('should call next if ctx.from is missing', async () => {
    delete ctx.from
    const middleware = usageLimitMiddleware(handler)

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
  })

  it('should create user and check limit if user does not exist', async () => {
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(null)
    const newUser = {
      _id: 'new-id',
      plan_type: PlanTypeEnum.Free,
    }
    vi.mocked(userRepository.create).mockResolvedValueOnce(newUser as any)
    vi.mocked(userRepository.isWithinLimit).mockResolvedValueOnce(true)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.create).toHaveBeenCalled()
    expect(userRepository.isWithinLimit).toHaveBeenCalledWith(12345, 3)
    expect(next).toHaveBeenCalled()
  })

  it('should block if Free user reaches limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)
    vi.mocked(userRepository.isWithinLimit).mockResolvedValueOnce(false)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('reached your daily limit of 3 operations'))
    expect(next).not.toHaveBeenCalled()
  })

  it('should block if Pro user reaches limit (50)', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)
    vi.mocked(userRepository.isWithinLimit).mockResolvedValueOnce(false)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('reached your daily limit of 50 operations'))
    expect(next).not.toHaveBeenCalled()
  })

  it('should allow if Pro user is within limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)
    vi.mocked(userRepository.isWithinLimit).mockResolvedValueOnce(true)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(userRepository.isWithinLimit).toHaveBeenCalledWith(12345, 50)
  })

  it('should revert to Free if Pro plan has expired', async () => {
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 31)

    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      plan_started_at: expiredDate,
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)
    vi.mocked(userRepository.isWithinLimit).mockResolvedValueOnce(true)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.updateById).toHaveBeenCalledWith('user-id', {
      plan_type: PlanTypeEnum.Free,
      plan_started_at: null,
    })
    expect(userRepository.isWithinLimit).toHaveBeenCalledWith(12345, 3)
    expect(next).toHaveBeenCalled()
  })
})
