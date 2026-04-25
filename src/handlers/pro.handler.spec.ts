import type { UserEntity } from '../entities/user.entity'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import process from 'node:process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { CurrencyEnum } from '../enums/currency.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { ProHandler } from './pro.handler'

describe(ProHandler.name, () => {
  let handler: ProHandler
  let userRepository: UserRepository

  beforeEach(() => {
    userRepository = {
      findByTelegramId: vi.fn().mockResolvedValue(null),
      updateById: vi.fn(),
    } as unknown as UserRepository

    handler = new ProHandler(userRepository)
    process.env.PROVIDER_TOKEN = 'test-token'
  })

  it('should be defined', () => {
    expect(handler).toBeDefined()
  })

  it('should have the correct command', () => {
    expect(handler.command).toBe(CommandEnum.Pro)
  })

  it('should have the correct description', () => {
    expect(handler.description).toBe('💎 Get PRO access')
  })

  describe(ProHandler.prototype.onCommand.name, () => {
    it('should tell the user if they are already PRO', async () => {
      const existingUser = {
        _id: 'user-id',
        telegram_user: { id: 12345 },
        plan_type: PlanTypeEnum.Pro,
      } as unknown as UserEntity

      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = {
        from: { id: 12345 },
        session: { command: null, params: null },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('You are already a PRO user! Enjoy all the benefits! 💎')
      expect(ctx.session.command).toBeNull()
    })

    it('should set session command and send invoice if user is not PRO using Stars (development)', async () => {
      process.env.NODE_ENV = 'development'
      const existingUser = {
        _id: 'user-id',
        telegram_user: { id: 12345 },
        plan_type: PlanTypeEnum.Free,
      } as unknown as UserEntity

      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = {
        from: { id: 12345 },
        session: { command: null, params: null },
        replyWithInvoice: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(ctx.session.command).toBe(CommandEnum.Pro)
      expect(ctx.replyWithInvoice).toHaveBeenCalledWith(
        'PDF Studio PRO',
        'Get unlimited access to all features and higher limits!',
        'pdf-studio-pro-subscription',
        CurrencyEnum.XTR,
        [{ label: 'PRO Subscription', amount: 1 }],
        {
          provider_token: '',
        },
      )
    })

    it('should use 350 stars in production', async () => {
      process.env.NODE_ENV = 'production'
      const existingUser = {
        _id: 'user-id',
        telegram_user: { id: 12345 },
        plan_type: PlanTypeEnum.Free,
      } as unknown as UserEntity

      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = {
        from: { id: 12345 },
        session: { command: null, params: null },
        replyWithInvoice: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(ctx.replyWithInvoice).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        [{ label: 'PRO Subscription', amount: 350 }],
        expect.any(Object),
      )
    })
  })

  describe('events', () => {
    describe('pre_checkout_query', () => {
      it('should answer the pre_checkout_query with true', async () => {
        const ctx = {
          answerPreCheckoutQuery: vi.fn(),
        } as unknown as CustomContext

        await handler.events.pre_checkout_query!(ctx)

        expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(true)
      })
    })

    describe('message:successful_payment', () => {
      it('should update user plan to Pro and reply', async () => {
        const existingUser = {
          _id: 'user-id',
          telegram_user: { id: 12345 },
          plan_type: PlanTypeEnum.Free,
        } as unknown as UserEntity

        vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

        const ctx = {
          from: { id: 12345 },
          session: { command: CommandEnum.Pro, params: null },
          reply: vi.fn(),
        } as unknown as CustomContext

        await handler.events['message:successful_payment']!(ctx)

        expect(userRepository.updateById).toHaveBeenCalledWith('user-id', {
          ...existingUser,
          plan_type: PlanTypeEnum.Pro,
        })
        expect(ctx.reply).toHaveBeenCalledWith('🎉 Thank you for subscribing to PRO! You now have full access to all features.')
        expect(ctx.session.command).toBeNull()
      })

      it('should do nothing if user is not found', async () => {
        vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(null)

        const ctx = {
          from: { id: 12345 },
          session: { command: CommandEnum.Pro, params: null },
          reply: vi.fn(),
        } as unknown as CustomContext

        await handler.events['message:successful_payment']!(ctx)

        expect(userRepository.updateById).not.toHaveBeenCalled()
        expect(ctx.reply).not.toHaveBeenCalled()
      })
    })
  })
})
