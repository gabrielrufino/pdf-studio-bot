import type { Db } from 'mongodb'
import type { BaseRepository } from './base.repository'
import { FeedbackRepository } from './feedback.repository'
import { MessageRepository } from './message.repository'
import { UserRepository } from './user.repository'

export { FeedbackRepository, MessageRepository, UserRepository }

export const repositories: Array<new (database: Db) => BaseRepository<any>> = [
  FeedbackRepository,
  MessageRepository,
  UserRepository,
]
