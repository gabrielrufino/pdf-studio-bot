import type { UserEntity } from '../entities/user.entity'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandEnum } from '../enums/command.enum'
import { HelpMessage } from '../messages/help.message'
import { WelcomeMessage } from '../messages/welcome.message'
import { StartHandler } from './start.handler'

describe(StartHandler.name, () => {
  let handler: StartHandler
  let userRepository: UserRepository

  beforeEach(() => {
    userRepository = {
      create: vi.fn(),
      findByTelegramId: vi.fn().mockResolvedValue(null),
      updateById: vi.fn(),
    } as unknown as UserRepository

    handler = new StartHandler(userRepository)
  })

  it('should be defined', () => {
    expect(handler).toBeDefined()
  })

  it('should have the correct command', () => {
    expect(handler.command).toBe(CommandEnum.Start)
  })

  describe(StartHandler.prototype.onCommand.name, () => {
    it('should call userRepository.findByTelegramId with the correct telegram ID', async () => {
      const ctx = {
        from: {
          id: 12345,
        },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(userRepository.findByTelegramId).toHaveBeenCalledWith(12345)
    })

    it('should create a new user if not found', async () => {
      const ctx = {
        from: {
          id: 12345,
        },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user: ctx.from,
        }),
      )
    })

    it('should update the user if found', async () => {
      const existingUser = {
        _id: 'user-id',
        telegram_user: {
          id: 12345,
        },
      } as unknown as UserEntity
      vi.spyOn(userRepository, 'findByTelegramId')
        .mockResolvedValueOnce(existingUser)

      const ctx = {
        from: {
          id: 12345,
        },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(userRepository.updateById).toHaveBeenCalledWith('user-id', existingUser)
    })

    it('should send welcome and help messages', async () => {
      const ctx = {
        from: {
          id: 12345,
        },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.onCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledTimes(2)
      expect(ctx.reply).toHaveBeenCalledWith(
        new WelcomeMessage()
          .build(),
        { parse_mode: 'HTML' },
      )
      expect(ctx.reply).toHaveBeenCalledWith(
        new HelpMessage()
          .build(),
      )
    })
  })
})
