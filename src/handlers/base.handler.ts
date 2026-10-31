import type { FilterQuery } from 'grammy'
import type { z } from 'zod'
import type { CommandEnum } from '../enums/command.enum'
import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import { DAILY_LIMITS, MAX_FILE_SIZE, MAX_PAGES, MAX_PRO_FILE_SIZE, MAX_PRO_PAGES } from '../config/constants'
import { logger } from '../config/logger'
import { PlanTypeEnum } from '../enums/plan-type.enum'
import { InvalidFileError } from '../errors/invalid-file.error'
import { LimitExceededError } from '../errors/limit-exceeded.error'
import { SessionValidationError } from '../errors/session-validation.error'
import { UserNotFoundError } from '../errors/user-not-found.error'

export abstract class BaseHandler {
  /** Telegram command enum value */
  public abstract readonly command: CommandEnum

  /** Description of the command */
  public abstract readonly description: string

  /** Additional event handlers keyed by filter query */
  public abstract readonly events: Partial<Record<FilterQuery, (ctx: CustomContext) => Promise<void>>>

  /** Main entry point invoked when a user triggers the command */
  public abstract onCommand(ctx: CustomContext): Promise<void>

  /** Whether this handler enforces daily usage limits */
  public readonly hasUsageLimits: boolean = true

  protected readonly logger = logger

  /**
   * Validates params against a Zod schema, throwing {@link SessionValidationError} on failure.
   */
  protected validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
    const result = schema.safeParse(params)

    if (!result.success) {
      this.logger.error({ error: result.error }, 'Session validation failed.')
      throw new SessionValidationError()
    }

    return result.data
  }

  /**
   * Verifies that the incoming message contains a PDF document (MIME type `application/pdf`).
   * Replies with an error message and throws {@link InvalidFileError} otherwise.
   */
  protected async validatePDF(ctx: CustomContext): Promise<void> {
    if (ctx.message?.document?.mime_type !== 'application/pdf') {
      await ctx.reply(ctx.t('invalid_pdf'))
      throw new InvalidFileError()
    }
  }

  /**
   * Stores the current command in the user session and cleans up old temporary files.
   */
  protected async setSessionCommand(ctx: CustomContext) {
    await this.removeTemporaryFiles(ctx)
    ctx.session.command = this.command
  }

  /**
   * Resets the user session, clearing both the command reference and stored parameters,
   * then removes associated temporary files.
   */
  protected async resetSession(ctx: CustomContext) {
    await this.removeTemporaryFiles(ctx)
    ctx.session.command = null
    ctx.session.params = null
  }

  /**
   * Sends a localized message indicating the user has reached their daily usage limit.
   */
  protected async notifyLimitExceeded(ctx: CustomContext): Promise<void> {
    const isPro = ctx.user?.plan_type === PlanTypeEnum.Pro
    await ctx.reply(ctx.t(isPro ? 'pro_limit_reached' : 'free_limit_reached'))
  }

  /**
   * Checks file size and page count against plan-specific limits, throwing
   * {@link LimitExceededError} when either threshold is breached.
   */
  protected async checkLimits(
    ctx: CustomContext,
    options: { fileSize?: number, pagesCount?: number },
  ): Promise<void> {
    const isPro = ctx.user?.plan_type === PlanTypeEnum.Pro

    if (options.fileSize !== undefined) {
      if (!isPro && options.fileSize > MAX_FILE_SIZE) {
        await this.notifyLimitExceeded(ctx)
        throw new LimitExceededError()
      }
      if (isPro && options.fileSize > MAX_PRO_FILE_SIZE) {
        await this.notifyLimitExceeded(ctx)
        throw new LimitExceededError()
      }
    }

    if (options.pagesCount !== undefined) {
      if (!isPro && options.pagesCount > MAX_PAGES) {
        await this.notifyLimitExceeded(ctx)
        throw new LimitExceededError()
      }
      if (isPro && options.pagesCount > MAX_PRO_PAGES) {
        await this.notifyLimitExceeded(ctx)
        throw new LimitExceededError()
      }
    }
  }

  /**
   * Increments the user's daily usage counter through the repository.
   * Returns `true` if successful; sends a limit-reached notification and returns `false` otherwise.
   */
  protected async incrementUsage(ctx: CustomContext, userRepository: UserRepository): Promise<boolean> {
    const isPro = ctx.user?.plan_type === PlanTypeEnum.Pro
    const limit = isPro ? DAILY_LIMITS[PlanTypeEnum.Pro] : DAILY_LIMITS[PlanTypeEnum.Free]

    const userId = ctx.from?.id
    if (!userId) {
      return false
    }

    const result = await userRepository.incrementUsage(userId, limit)
    if (!result) {
      await this.notifyLimitExceeded(ctx)
      return false
    }

    ctx.user = result
    return true
  }

  /**
   * Decrements the user's daily usage counter through the repository.
   * Returns `true` if the counter was updated successfully.
   */
  protected async decrementUsage(ctx: CustomContext, userRepository: UserRepository): Promise<boolean> {
    const userId = ctx.from?.id
    if (!userId) {
      return false
    }

    const result = await userRepository.decrementUsage(userId)
    if (!result) {
      return false
    }

    ctx.user = result
    return true
  }

  /**
   * Executes an asynchronous action while managing daily usage accounting.
   * Automatically decrements the usage counter if the action throws before completing.
   */
  protected async runWithUsage(
    ctx: CustomContext,
    userRepository: UserRepository,
    action: (markDelivered: () => void) => Promise<void>,
  ): Promise<void> {
    let usageReserved = false
    let delivered = false
    try {
      usageReserved = await this.incrementUsage(ctx, userRepository)
      if (!usageReserved) {
        return
      }
      await action(() => {
        delivered = true
      })
    }
    catch (error) {
      if (usageReserved && !delivered) {
        await this.decrementUsage(ctx, userRepository)
      }
      throw error
    }
  }

  /**
   * Orchestrates the full lifecycle of processing a PDF document: validates MIME type,
   * enforces limits, downloads the file, delegates to the `processing` callback, handles errors
   * with localized messages, and cleans up the session afterwards.
   */
  protected async processDocument(
    ctx: CustomContext,
    userRepository: UserRepository,
    processing: (inputPath: string) => Promise<void>,
    errorKey: string,
    paths: { inputPath?: string, outputPath?: string },
  ): Promise<void> {
    try {
      await this.validatePDF(ctx)

      if (!ctx.user) {
        throw new UserNotFoundError()
      }

      const fileSize = ctx.message?.document?.file_size ?? 0
      await this.checkLimits(ctx, { fileSize })

      await this.runWithUsage(ctx, userRepository, async () => {
        const file = await ctx.getFile()
        paths.inputPath = await file.download()

        if (!paths.inputPath) {
          throw new Error('Failed to download file')
        }

        await processing(paths.inputPath)
      })
    }
    catch (error) {
      if (error instanceof InvalidFileError || error instanceof LimitExceededError) {
        return
      }

      this.logger.error(error)
      await ctx.reply(ctx.t(errorKey))
    }
    finally {
      ctx.session.params = {
        paths: [paths.inputPath, paths.outputPath].filter(Boolean) as string[],
      }
      await this.resetSession(ctx)
    }
  }

  /**
   * Removes all temporary files and directories referenced in the current session's parameters.
   */
  private async removeTemporaryFiles(ctx: CustomContext) {
    const params = ctx.session.params

    if (!params) {
      return
    }

    const paths: string[] = []

    if ('path' in params && typeof params.path === 'string') {
      paths.push(params.path)
    }

    if ('paths' in params && Array.isArray(params.paths)) {
      paths.push(...params.paths.filter((p): p is string => typeof p === 'string'))
    }

    await Promise.all(
      paths.map((path: string) =>
        fs.rm(path, { force: true, recursive: true }).catch((error: unknown) =>
          this.logger.error({ error, path }, 'Failed to remove temporary file/folder.'),
        ),
      ),
    )
  }
}
