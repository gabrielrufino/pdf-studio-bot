import type { Nullable } from '@gabrielrufino/types'
import type { CommandEnum } from '../enums/command.enum'
import type { DownloadParams } from '../schemas/download-params.schema'
import type { JoinParams } from '../schemas/join-params.schema'
import type { PutPasswordParams } from '../schemas/put-password-params.schema'

export interface SessionData {
  command: Nullable<CommandEnum>
  params: Nullable<PutPasswordParams | DownloadParams | JoinParams>
}
