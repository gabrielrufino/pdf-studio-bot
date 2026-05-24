import type { UserRepository } from '../repositories/user.repository'
import type { CustomContext } from '../types/custom-context.type'
import { vi } from 'vitest'

export function createMockContext(text = 'password123'): CustomContext {
  return {
    t: (key: string) => key,
    from: { id: 123 },
    session: {
      command: null,
      params: { path: null },
    },
    message: {
      text,
      message_id: 1,
      document: {
        mime_type: 'application/pdf',
      },
    },
    chat: { id: 100 },
    getFile: vi.fn(),
    reply: vi.fn(),
    replyWithDocument: vi.fn().mockResolvedValue({}),
    deleteMessage: vi.fn().mockResolvedValue(true),
  } as unknown as CustomContext
}

export function createMockUserRepository(): UserRepository {
  return {
    incrementUsage: vi.fn(),
  } as unknown as UserRepository
}
