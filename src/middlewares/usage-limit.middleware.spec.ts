import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { userRepository } from '../repositories'
import { usageLimitMiddleware } from './usage-limit.middleware'

vi.mock('../repositories', () => ({
  userRepository: {
    findByTelegramId: vi.fn(),
    create: vi.fn(),
    incrementUsage: vi.fn(),
    updateById: vi.fn(),
  },
}))

vi.mock('../config/constants', () => ({
  DAILY_LIMITS: {
    free: 3,
    pro: 50,
  },
}))

describe(usageLimitMiddleware.name, () => {
  let next: any
  let ctx: any
  let handler: any

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
    next = vi.fn()
    ctx = {
      t: (key: string) => key,
      from: { id: 12345 },
      reply: vi.fn(),
      user: undefined,
    }
    handler = {
      hasUsageLimits: true,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('should not query db if ctx.user is present', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      is_blocked: false,
      daily_usage_count: 49,
      last_usage_date: '2024-01-15',
    }
    ctx.user = user as any

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('should create user and check limit if user does not exist', async () => {
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(null)
    const newUser = {
      _id: 'new-id',
      plan_type: PlanTypeEnum.Free,
      is_blocked: false,
      daily_usage_count: 0,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.create).mockResolvedValueOnce(newUser as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.create).toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('should call next if user is within daily limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      is_blocked: false,
      daily_usage_count: 2,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should allow if Pro user is within limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      is_blocked: false,
      daily_usage_count: 49,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should reject if Free user has exceeded daily limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      is_blocked: false,
      daily_usage_count: 3,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
  })

  it('should reject if Pro user has exceeded daily limit', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      is_blocked: false,
      daily_usage_count: 50,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('pro_limit_reached')
  })

  it('should allow if usage count equals limit but last_usage_date is not today', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      is_blocked: false,
      daily_usage_count: 3,
      last_usage_date: '2024-01-14',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should allow if usage count exceeds limit but last_usage_date is from a previous day', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      is_blocked: false,
      daily_usage_count: 100,
      last_usage_date: '2000-01-01',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should allow if user has no last_usage_date even if count is high', async () => {
    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Free,
      is_blocked: false,
      daily_usage_count: 100,
      last_usage_date: undefined,
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should revert to Free if Pro plan has expired', async () => {
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 31)

    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      plan_started_at: expiredDate,
      is_blocked: false,
      daily_usage_count: 0,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.updateById).toHaveBeenCalledWith('user-id', {
      plan_type: PlanTypeEnum.Free,
      plan_started_at: null,
    })
    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('should not revert to Free if Pro plan has not expired', async () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 15)

    const user = {
      _id: 'user-id',
      plan_type: PlanTypeEnum.Pro,
      plan_started_at: recentDate,
      is_blocked: false,
      daily_usage_count: 0,
      last_usage_date: '2024-01-15',
    }
    vi.mocked(userRepository.findByTelegramId).mockResolvedValueOnce(user as any)

    const middleware = usageLimitMiddleware(handler)
    await middleware(ctx, next)

    expect(userRepository.updateById).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})
