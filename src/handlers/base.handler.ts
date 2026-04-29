import type { FilterQuery } from 'grammy'
import type { z } from 'zod'
import type { CommandEnum } from '../enums/command.enum'
import type { CustomContext } from '../types/custom-context.type'
import fs from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { logger } from '../config/logger'
import { InvalidFileError } from '../errors/invalid-file.error'
import { SessionValidationError } from '../errors/session-validation.error'

export abstract class BaseHandler {
  public abstract readonly command: CommandEnum
  public abstract readonly description: string
  public abstract readonly events: Partial<Record<FilterQuery, (ctx: CustomContext) => Promise<void>>>
  public abstract onCommand(ctx: CustomContext): Promise<void>
  public readonly hasUsageLimits: boolean = true

  protected readonly logger = logger

  protected validateParams<T>(schema: z.ZodSchema<T>, params: any): T {
    const result = schema.safeParse(params)

    if (!result.success) {
      this.logger.error({ error: result.error }, 'Session validation failed.')
      throw new SessionValidationError()
    }

    return result.data
  }

  protected async validatePDF(ctx: CustomContext): Promise<void> {
    if (ctx.message?.document?.mime_type !== 'application/pdf') {
      await ctx.reply('⚠️ Please send only PDF files.')
      throw new InvalidFileError()
    }
  }

  protected async setSessionCommand(ctx: CustomContext) {
    await this.removeTemporaryFiles(ctx)
    ctx.session.command = this.command
  }

  protected async resetSession(ctx: CustomContext) {
    await this.removeTemporaryFiles(ctx)
    ctx.session.command = null
    ctx.session.params = null
  }

  protected async createTempDir(prefix: string): Promise<string> {
    const dir = await fs.mkdtemp(join(os.tmpdir(), prefix))
    await fs.chmod(dir, 0o700)
    return dir
  }

  protected async downloadDocument(ctx: CustomContext): Promise<string> {
    const file = await ctx.getFile()
    const path = await file.download()

    if (!path) {
      throw new Error('Failed to download file')
    }

    return path
  }

  protected async safeCleanup(paths: (string | undefined)[]): Promise<void> {
    await Promise.all(
      paths.map(path =>
        path
          ? fs.rm(path, { force: true, recursive: true }).catch(error =>
              this.logger.error({ error, path }, 'Failed to remove temporary file/folder.'))
          : Promise.resolve(),
      ),
    )
  }

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
      paths.map(path =>
        fs.rm(path, { force: true, recursive: true }).catch(error =>
          this.logger.error({ error, path }, 'Failed to remove temporary file/folder.'),
        ),
      ),
    )
  }
}
