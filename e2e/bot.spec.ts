import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('bot E2E', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()
    process.env.MONGODB_CONNECTION_STRING = uri
    process.env.BOT_TOKEN = 'fake-token'
    process.env.GOOGLE_GENAI_API_KEY = 'fake-genai-key'

    client = new MongoClient(uri)
    await client.connect()
  })

  afterAll(async () => {
    await client.close()
    await mongod.stop()
  })

  it('should respond to /start command', async () => {
    // Import bot and repositories after setting up env vars
    const { bot } = await import('../src/config/bot')
    const { handlers } = await import('../src/handlers')
    const { repositories } = await import('../src/repositories')

    // Initialize repositories
    await Promise.all(repositories.map(repo => repo.init()))

    // Mock bot info
    bot.botInfo = {
      id: 1,
      is_bot: true,
      first_name: 'PDF Studio Bot',
      username: 'PDFStudio_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    }

    // Register handlers (similar to src/index.ts)
    for (const handler of handlers) {
      bot.command(
        handler.command,
        handler.onCommand.bind(handler),
      )
    }

    // Mock bot.api calls
    const calls: any[] = []
    bot.api.config.use((_prev, method, payload) => {
      calls.push({ method, payload })
      return { ok: true, result: { message_id: 1, chat: { id: payload.chat_id, type: 'private' }, date: Date.now(), text: payload.text } } as any
    })

    // Simulate /start command
    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 123, is_bot: false, first_name: 'Test User', username: 'testuser' },
        chat: { id: 123, type: 'private', first_name: 'Test User', username: 'testuser' },
        date: Math.floor(Date.now() / 1000),
        text: '/start',
        entities: [{ type: 'bot_command', offset: 0, length: 6 }],
      },
    })

    // Verify response
    expect(calls.length).toBeGreaterThan(0)
    const sendMessageCall = calls.find(c => c.method === 'sendMessage')
    expect(sendMessageCall).toBeDefined()
    expect(sendMessageCall.payload.chat_id).toBe(123)
    expect(sendMessageCall.payload.text).toContain('Welcome')

    // Verify user was created in DB
    const db = client.db('pdf_studio')
    const user = await db.collection('users').findOne({ 'telegram_user.id': 123 })
    expect(user).toBeDefined()
    expect(user?.telegram_user?.first_name).toBe('Test User')
  })
})
