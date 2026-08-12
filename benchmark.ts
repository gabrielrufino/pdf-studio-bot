import { authMiddleware } from './src/middlewares/auth.middleware'
import { i18nMiddleware } from './src/middlewares/i18n.middleware'
import { usageLimitMiddleware } from './src/middlewares/usage-limit.middleware'
import { userRepository } from './src/repositories'

const mockUser = {
  is_blocked: false,
  language: 'en',
  plan_type: 'free',
}

let queryCount = 0

userRepository.findByTelegramId = async () => {
  queryCount++
  return mockUser as any
}

userRepository.create = async () => mockUser as any

const ctx = {
  from: { id: 12345, language_code: 'en' },
  session: { language: null },
  reply: async () => {},
  t: () => '',
} as any

async function run() {
  queryCount = 0
  const next = async () => {}
  await authMiddleware(ctx, async () => {
    await i18nMiddleware(ctx, async () => {
      const handler = { hasUsageLimits: true }
      await usageLimitMiddleware(handler as any)(ctx, next)
    })
  })
  console.log(`Queries made: ${queryCount}`)
}

run()
