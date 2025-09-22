import type { Nullable } from '@gabrielrufino/types'
import type { CommandEnum } from '../enumerables/command.enum'

export interface PutPasswordParams {
  path: Nullable<string>
}

export interface DownloadParams {
  url: Nullable<string>
}

export interface SessionData {
  command: Nullable<CommandEnum>
  params: Nullable<PutPasswordParams | DownloadParams>
}
