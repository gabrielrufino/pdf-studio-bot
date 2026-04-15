import { database } from '../config/database'
import { FeedbackRepository } from './feedback.repository'
import { MessageRepository } from './message.repository'
import { UserRepository } from './user.repository'

export const feedbackRepository = new FeedbackRepository(database)
export const messageRepository = new MessageRepository(database)
export const userRepository = new UserRepository(database)

export const repositories = [
  feedbackRepository,
  messageRepository,
  userRepository,
]
