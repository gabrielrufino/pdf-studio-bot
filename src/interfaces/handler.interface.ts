import type { FilterQuery } from 'grammy'
import type { CustomContext } from '../config/bot'
import type { CommandEnum } from '../enumerables/command.enum'

export interface Handler {
  readonly command: CommandEnum
  readonly events: Partial<Record<FilterQuery, (context: CustomContext) => Promise<void>>>
  onCommand: (context: CustomContext) => Promise<void>
}
