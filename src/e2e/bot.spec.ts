import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

describe('bot E2E', () => {
  let mongod: MongoMemoryServer
  let client: MongoClient
  let bot: any
  let calls: any[] = []

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()
    vi.stubEnv('MONGODB_CONNECTION_STRING', uri)
    vi.stubEnv('BOT_TOKEN', 'DUMMY_TOKEN')
    vi.stubEnv('GOOGLE_GENAI_API_KEY', 'DUMMY_KEY')

    client = new MongoClient(uri)
    await client.connect()

    const { bot: botInstance } = await import('../config/bot')
    const { initApp } = await import('../app')

    bot = botInstance

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
      can_manage_bots: true,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
    }

    bot.api.config.use((_prev: any, method: string, payload: any) => {
      calls.push({ method, payload })
      if (method === 'getFile') {
        return { ok: true, result: { file_id: payload.file_id, file_path: 'fake-path' } }
      }
      return { ok: true, result: { message_id: 1, chat: { id: (payload as any).chat_id || 123, type: 'private' }, date: Date.now(), text: (payload as any).text || '' } } as any
    })

    await initApp()
  })

  afterAll(async () => {
    await client.close()
    await mongod.stop()
    vi.unstubAllEnvs()
  })

  const createUpdate = (text: string, fromId: number) => ({
    update_id: Math.floor(Math.random() * 1000000),
    message: {
      message_id: Math.floor(Math.random() * 1000000),
      from: { id: fromId, is_bot: false, first_name: 'Test User', username: 'testuser' },
      chat: { id: fromId, type: 'private', first_name: 'Test User', username: 'testuser' },
      date: Math.floor(Date.now() / 1000),
      text,
      entities: text.startsWith('/') ? [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] : [],
    },
  })

  it('should respond to /start command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/start', 1001))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('Welcome'))).toBe(true)
  })

  it('should respond to /help command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/help', 1002))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.toLowerCase().includes('operation'))).toBe(true)
  })

  it('should handle /download command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/download', 1003))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('URL'))).toBe(true)
  })

  it('should handle /join command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/join', 1004))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.toLowerCase().includes('join'))).toBe(true)
  })

  it('should handle /pdftoimages command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/pdftoimages', 1005))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('PDF'))).toBe(true)
  })

  it('should handle /putpassword command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/putpassword', 1006))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('PDF'))).toBe(true)
  })

  it('should handle /split command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/split', 1007))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('PDF'))).toBe(true)
  })

  it('should handle /summary command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/summary', 1008))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('PDF'))).toBe(true)
  })

  it('should handle /feedback command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/feedback', 1009))
    expect(calls.some((c: any) => c.method === 'sendMessage' && c.payload.text.includes('feedback'))).toBe(true)
  })

  it('should respond to /pro command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/pro', 1010))
    expect(calls.some((c: any) => c.method === 'sendInvoice' || (c.method === 'sendMessage' && c.payload.text.includes('PRO')))).toBe(true)
  })

  it('should respond to /version command', async () => {
    calls = []
    await bot.handleUpdate(createUpdate('/version', 1011))
    const sendMessageCall = calls.find((c: any) => c.method === 'sendMessage')
    expect(sendMessageCall).toBeDefined()
    expect(sendMessageCall.payload.text).toMatch(/\d+\.\d+\.\d+/)
  })
})
