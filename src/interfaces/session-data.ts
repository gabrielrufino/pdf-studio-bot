import type { CommandEnum } from '../enumerables/command.enum'

export interface PutPasswordParams {
  path: string | null
}

export interface SessionData {
  command: CommandEnum | null
  params: PutPasswordParams | null
}
