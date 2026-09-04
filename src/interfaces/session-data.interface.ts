import type { Nullable } from '@gabrielrufino/types'
import type { CommandEnum } from '../enums/command.enum'
import type { LanguageEnum } from '../enums/language.enum'
import type { DownloadParams } from '../schemas/download-params.schema'
import type { ExtractParams } from '../schemas/extract-params.schema'
import type { JoinParams } from '../schemas/join-params.schema'
import type { PasswordParams } from '../schemas/password-params.schema'
import type { RotateParams } from '../schemas/rotate-params.schema'

export interface SessionData {
  command: Nullable<CommandEnum>
  params: Nullable<PasswordParams | DownloadParams | JoinParams | RotateParams | ExtractParams>
  language?: Nullable<LanguageEnum>
}
