import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE, MAX_PAGES, MAX_PRO_FILE_SIZE, MAX_PRO_PAGES } from '../config/constants'
import { CommandEnum } from '../enums/command.enum'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { BaseHandler } from './base.handler'

describe(BaseHandler.name, () => {
  class TestHandler extends BaseHandler {
    readonly command = CommandEnum.Test
    readonly description = 'Test command'
    readonly events = {}
    async onCommand() {}

    // Expose protected methods for testing
    public async setSessionCommand(ctx: CustomContext) {
      await super.setSessionCommand(ctx)
    }

    public async resetSession(ctx: CustomContext) {
      await super.resetSession(ctx)
    }

    public async validatePDF(ctx: CustomContext) {
      await super.validatePDF(ctx)
    }

    public async notifyLimitExceeded(ctx: CustomContext) {
      await super.notifyLimitExceeded(ctx)
    }

    public async checkLimits(ctx: CustomContext, options: { fileSize?: number, pagesCount?: number }) {
      await super.checkLimits(ctx, options)
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should set session command correctly', async () => {
    const handler = new TestHandler()
    const ctx: any = { t: (key: string) => key, session: {
      command: null,
      params: null,
    } } as CustomContext

    await handler.setSessionCommand(ctx)

    expect(ctx.session.command).toBe(CommandEnum.Test)
  })

  it('should reset session correctly', async () => {
    const handler = new TestHandler()
    const ctx: any = { t: (key: string) => key, session: {
      command: CommandEnum.Test,
      params: { someParam: 'value' },
    } } as unknown as CustomContext

    await handler.resetSession(ctx)

    expect(ctx.session.command).toBeNull()
    expect(ctx.session.params).toBeNull()
  })

  describe('validatePDF', () => {
    it('should not throw if mime type is application/pdf', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, message: {
        document: {
          mime_type: 'application/pdf',
        },
      } } as unknown as CustomContext

      await expect(handler.validatePDF(ctx)).resolves.not.toThrow()
    })

    it('should throw InvalidFileError and reply if mime type is not application/pdf', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, message: {
        document: {
          mime_type: 'image/png',
        },
      }, reply: vi.fn() } as unknown as CustomContext

      await expect(handler.validatePDF(ctx)).rejects.toThrow(InvalidFileError)
      expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
    })

    it('should throw InvalidFileError and reply if document is missing', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, message: {
        text: 'hello',
      }, reply: vi.fn() } as unknown as CustomContext

      await expect(handler.validatePDF(ctx)).rejects.toThrow(InvalidFileError)
      expect(ctx.reply).toHaveBeenCalledWith('invalid_pdf')
    })
  })

  describe('removeTemporaryFiles', () => {
    it('should remove temporary file if path exists in params', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, session: {
        command: CommandEnum.Test,
        params: { path: '/tmp/test-file' },
      } } as unknown as CustomContext

      const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalledWith('/tmp/test-file', { force: true, recursive: true })
    })

    it('should remove temporary files if paths exist in params', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, session: {
        command: CommandEnum.Test,
        params: { paths: ['/tmp/file1', '/tmp/file2'] },
      } } as unknown as CustomContext

      const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalledWith('/tmp/file1', { force: true, recursive: true })
      expect(rmSpy).toHaveBeenCalledWith('/tmp/file2', { force: true, recursive: true })
    })

    it('should ignore non-string paths in paths array', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, session: {
        command: CommandEnum.Test,
        params: { paths: ['/tmp/file1', 123, null] },
      } } as unknown as CustomContext

      const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalledTimes(1)
      expect(rmSpy).toHaveBeenCalledWith('/tmp/file1', { force: true, recursive: true })
    })

    it('should catch and log error if fs.rm fails', async () => {
      const handler = new TestHandler()
      const ctx: any = { t: (key: string) => key, session: {
        command: CommandEnum.Test,
        params: { path: '/tmp/test-file' },
      } } as unknown as CustomContext

      const error = new Error('Permission denied')
      const rmSpy = vi.spyOn(fs, 'rm').mockRejectedValue(error)
      const loggerSpy = vi.spyOn((handler as any).logger, 'error')

      await handler.resetSession(ctx)

      expect(rmSpy).toHaveBeenCalled()
      expect(loggerSpy).toHaveBeenCalledWith({ error, path: '/tmp/test-file' }, 'Failed to remove temporary file/folder.')
    })
  })

  describe('validateParams', () => {
    it('should return data if validation succeeds', () => {
      const handler = new TestHandler()
      const schema = { safeParse: vi.fn().mockReturnValue({ success: true, data: { foo: 'bar' } }) } as any
      const result = (handler as any).validateParams(schema, { foo: 'bar' })
      expect(result).toEqual({ foo: 'bar' })
    })

    it('should throw SessionValidationError if validation fails', () => {
      const handler = new TestHandler()
      const schema = { safeParse: vi.fn().mockReturnValue({ success: false, error: new Error('Validation failed') }) } as any
      expect(() => (handler as any).validateParams(schema, { foo: 'bar' })).toThrow()
    })
  })

  describe('notifyLimitExceeded', () => {
    it('should reply with free_limit_reached for Free users', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Free },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.notifyLimitExceeded(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
    })

    it('should reply with pro_limit_reached for Pro users', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Pro },
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.notifyLimitExceeded(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('pro_limit_reached')
    })

    it('should reply with free_limit_reached if user is undefined', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        reply: vi.fn(),
      } as unknown as CustomContext

      await handler.notifyLimitExceeded(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
    })
  })

  describe('checkLimits', () => {
    it('should not throw if file size and page count are within free limits', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Free },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(
        handler.checkLimits(ctx, { fileSize: MAX_FILE_SIZE, pagesCount: MAX_PAGES }),
      ).resolves.not.toThrow()
    })

    it('should throw LimitExceededError and reply free_limit_reached when free user exceeds file size', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Free },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(
        handler.checkLimits(ctx, { fileSize: MAX_FILE_SIZE + 1 }),
      ).rejects.toThrow(LimitExceededError)
      expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
    })

    it('should throw LimitExceededError and reply free_limit_reached when free user exceeds page count', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Free },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(
        handler.checkLimits(ctx, { pagesCount: MAX_PAGES + 1 }),
      ).rejects.toThrow(LimitExceededError)
      expect(ctx.reply).toHaveBeenCalledWith('free_limit_reached')
    })

    it('should not throw if file size and page count are within pro limits', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Pro },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(
        handler.checkLimits(ctx, { fileSize: MAX_PRO_FILE_SIZE, pagesCount: MAX_PRO_PAGES }),
      ).resolves.not.toThrow()
    })

    it('should throw LimitExceededError and reply pro_limit_reached when pro user exceeds file size', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Pro },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(
        handler.checkLimits(ctx, { fileSize: MAX_PRO_FILE_SIZE + 1 }),
      ).rejects.toThrow(LimitExceededError)
      expect(ctx.reply).toHaveBeenCalledWith('pro_limit_reached')
    })

    it('should throw LimitExceededError and reply pro_limit_reached when pro user exceeds page count', async () => {
      const handler = new TestHandler()
      const ctx: any = {
        t: (key: string) => key,
        user: { plan_type: PlanTypeEnum.Pro },
        reply: vi.fn(),
      } as unknown as CustomContext

      await expect(
        handler.checkLimits(ctx, { pagesCount: MAX_PRO_PAGES + 1 }),
      ).rejects.toThrow(LimitExceededError)
      expect(ctx.reply).toHaveBeenCalledWith('pro_limit_reached')
    })
  })

  it('should have usage limits enabled by default', () => {
    const handler = new TestHandler()
    expect(handler.hasUsageLimits).toBe(true)
  })
})
