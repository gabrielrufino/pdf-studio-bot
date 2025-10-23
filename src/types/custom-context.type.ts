import type { FileFlavor } from '@grammyjs/files'
import type { Context, SessionFlavor } from 'grammy'
import type { SessionData } from '../interfaces/session-data'

export type CustomContext = FileFlavor<Context> & SessionFlavor<SessionData>
