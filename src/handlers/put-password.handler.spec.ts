import type { CustomContext } from '../types/custom-context.type'
import { InputFile } from 'grammy'
import { describe, expect, it, vi } from 'vitest'
import { PutPasswordHandler } from './put-password.handler'

vi.mock('../config/bot', () => {
  return {
    bot: {
      api: {
        deleteMessage: vi.fn(),
      },
    },
  }
})

describe(PutPasswordHandler.name, () => {
  const handler = new PutPasswordHandler()

  describe('events', () => {
    describe('msg:text', () => {
      it('should send a document with the password applied', async () => {
        const replyWithDocument = vi.fn()

        await handler.events['msg:text']({
          reply: vi.fn(),
          message: { text: 'mypassword', message_id: 123 } as any,
          chat: { id: 12345 } as any,
          session: {
            params: { path: `${process.cwd()}/assets/lorem-ipsum.pdf` },
          },
          replyWithDocument,
        } as unknown as CustomContext)

        expect(replyWithDocument).toHaveBeenCalledWith(expect.any(InputFile))
      })
    })
  })
})
