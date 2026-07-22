import type { UserEntity } from '../entities/user.entity'
import type { ConfigurationRepository } from '../repositories/configuration.repository'
import type { PaymentRepository } from '../repositories/payment.repository'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { CurrencyEnum } from '../enums/currency.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { ProHandler } from './pro.handler'

describe(ProHandler.name, () => {
  let handler: ProHandler
  let userRepository: UserRepository
  let paymentRepository: PaymentRepository
  let configurationRepository: ConfigurationRepository

  const createMockUser = (overrides?: Partial<UserEntity>): UserEntity => ({
    _id: 'user-id',
    telegram_user: { id: 12345 },
    plan_type: PlanTypeEnum.Free,
    ...overrides,
  } as unknown as UserEntity)

  const createMockContext = (overrides?: any): CustomContext => ({ t: (key: string) => key, from: { id: 12345 }, session: { command: null, params: null }, reply: vi.fn(), replyWithInvoice: vi.fn(), answerPreCheckoutQuery: vi.fn(), answerCallbackQuery: vi.fn(), editMessageText: vi.fn(), ...overrides } as unknown as CustomContext)

  beforeEach(() => {
    userRepository = {
      findByTelegramId: vi.fn().mockResolvedValue(null),
      updateById: vi.fn(),
    } as unknown as UserRepository

    paymentRepository = {
      create: vi.fn(),
    } as unknown as PaymentRepository

    configurationRepository = {
      findGlobalConfig: vi.fn().mockResolvedValue({
        _id: 'global_config',
        pro_price: 350,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as unknown as ConfigurationRepository

    handler = new ProHandler(userRepository, paymentRepository, configurationRepository)
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
      const existingUser = createMockUser({ plan_type: PlanTypeEnum.Pro })
      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = createMockContext()

      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('pro_already_pro')
      expect(ctx.session.command).toBeNull()
    })

    it('should set session command and send inline keyboard with trial and buy buttons', async () => {
      const existingUser = createMockUser({ has_used_trial: false })
      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = createMockContext()

      await handler.onCommand(ctx)

      expect(ctx.session.command).toBe(CommandEnum.Pro)
      expect(ctx.reply).toHaveBeenCalledWith('pro_upgrade', expect.objectContaining({
        reply_markup: expect.any(Object),
      }))
      const replyCall = vi.mocked(ctx.reply).mock.calls[0]
      const replyMarkup = replyCall[1]?.reply_markup as any
      expect(replyMarkup.inline_keyboard[0][0].callback_data).toBe('pro_start_trial')
      expect(replyMarkup.inline_keyboard[1][0].callback_data).toBe('pro_send_invoice')
    })

    it('should not show trial button if has_used_trial is true', async () => {
      const existingUser = createMockUser({ has_used_trial: true })
      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = createMockContext()

      await handler.onCommand(ctx)

      expect(ctx.session.command).toBe(CommandEnum.Pro)
      expect(ctx.reply).toHaveBeenCalledWith('pro_upgrade', expect.objectContaining({
        reply_markup: expect.any(Object),
      }))
      const replyCall = vi.mocked(ctx.reply).mock.calls[0]
      const replyMarkup = replyCall[1]?.reply_markup as any
      expect(replyMarkup.inline_keyboard[0][0].callback_data).toBe('pro_send_invoice')
      expect(replyMarkup.inline_keyboard).toHaveLength(1)
    })

    it('should tell the user if they are on ProTrial', async () => {
      const existingUser = createMockUser({ plan_type: PlanTypeEnum.ProTrial })
      vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

      const ctx = createMockContext()

      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('pro_trial_active')
      expect(ctx.session.command).toBeNull()
    })

    it('should do nothing if ctx.from is missing', async () => {
      const ctx = createMockContext({ from: undefined })

      await handler.onCommand(ctx)

      expect(ctx.reply).not.toHaveBeenCalled()
      expect(ctx.replyWithInvoice).not.toHaveBeenCalled()
    })
  })

  describe('events', () => {
    describe('pre_checkout_query', () => {
      it('should answer the pre_checkout_query with true', async () => {
        const ctx = createMockContext()

        await handler.events.pre_checkout_query(ctx)

        expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(true)
      })
    })

    describe('message:successful_payment', () => {
      it('should update user plan to Pro and reply', async () => {
        const existingUser = createMockUser()
        vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

        const ctx = createMockContext({
          session: { command: CommandEnum.Pro, params: null },
          message: { successful_payment: { total_amount: 350, currency: CurrencyEnum.XTR } },
        })

        await handler.events['message:successful_payment'](ctx)

        expect(userRepository.updateById).toHaveBeenCalledWith('user-id', {
          plan_type: PlanTypeEnum.Pro,
          plan_started_at: expect.any(Date),
        })
        expect(paymentRepository.create).toHaveBeenCalled()
        expect(ctx.reply).toHaveBeenCalledWith('pro_success')
        expect(ctx.session.command).toBeNull()
      })

      it('should do nothing if ctx.from is missing', async () => {
        const ctx = createMockContext({ from: undefined })

        await handler.events['message:successful_payment'](ctx)

        expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
        expect(userRepository.updateById).not.toHaveBeenCalled()
      })

      it('should do nothing if user is not found', async () => {
        vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(null)

        const ctx = createMockContext({
          session: { command: CommandEnum.Pro, params: null },
          message: { successful_payment: { total_amount: 350, currency: CurrencyEnum.XTR } },
        })

        await handler.events['message:successful_payment'](ctx)

        expect(userRepository.updateById).not.toHaveBeenCalled()
        expect(ctx.reply).not.toHaveBeenCalled()
      })
    })

    describe('callback_query', () => {
      it('should start trial if data is pro_start_trial', async () => {
        const existingUser = createMockUser({ has_used_trial: false })
        vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

        const ctx = createMockContext({
          callbackQuery: { data: 'pro_start_trial' },
        })

        await handler.events['callback_query'](ctx)

        expect(userRepository.updateById).toHaveBeenCalledWith('user-id', {
          plan_type: PlanTypeEnum.ProTrial,
          plan_started_at: expect.any(Date),
          has_used_trial: true,
        })
        expect(ctx.answerCallbackQuery).toHaveBeenCalled()
        expect(ctx.editMessageText).toHaveBeenCalledWith('pro_trial_started')
        expect(ctx.session.command).toBeNull()
      })

      it('should not start trial if has_used_trial is true', async () => {
        const existingUser = createMockUser({ has_used_trial: true })
        vi.spyOn(userRepository, 'findByTelegramId').mockResolvedValueOnce(existingUser)

        const ctx = createMockContext({
          callbackQuery: { data: 'pro_start_trial' },
        })

        await handler.events['callback_query'](ctx)

        expect(userRepository.updateById).not.toHaveBeenCalled()
        expect(ctx.answerCallbackQuery).not.toHaveBeenCalled()
      })

      it('should send invoice if data is pro_send_invoice', async () => {
        const ctx = createMockContext({
          callbackQuery: { data: 'pro_send_invoice' },
        })

        await handler.events['callback_query'](ctx)

        expect(configurationRepository.findGlobalConfig).toHaveBeenCalled()
        expect(ctx.answerCallbackQuery).toHaveBeenCalled()
        expect(ctx.replyWithInvoice).toHaveBeenCalledWith(
          'PDF Studio PRO',
          'pro_upgrade',
          'pdf-studio-pro-subscription',
          CurrencyEnum.XTR,
          [{ label: 'PRO Subscription', amount: 350 }],
          { provider_token: '' },
        )
      })

      it('should use pro_price from config when sending invoice', async () => {
        vi.spyOn(configurationRepository, 'findGlobalConfig').mockResolvedValueOnce({
          _id: 'global_config',
          pro_price: 500,
          created_at: new Date(),
          updated_at: new Date(),
        } as any)

        const ctx = createMockContext({
          callbackQuery: { data: 'pro_send_invoice' },
        })

        await handler.events['callback_query'](ctx)

        expect(ctx.replyWithInvoice).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          [{ label: 'PRO Subscription', amount: 500 }],
          expect.any(Object),
        )
      })

      it('should do nothing if ctx.from is missing', async () => {
        const ctx = createMockContext({ from: undefined, callbackQuery: { data: 'pro_start_trial' } })
        await handler.events['callback_query'](ctx)
        expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
      })

      it('should do nothing if callback data is missing', async () => {
        const ctx = createMockContext({ callbackQuery: { data: undefined } })
        await handler.events['callback_query'](ctx)
        expect(userRepository.findByTelegramId).not.toHaveBeenCalled()
      })
    })
  })
})
