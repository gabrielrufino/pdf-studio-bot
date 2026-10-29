export async function setup() {
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const mongod = await MongoMemoryServer.create()
  // Share the URI across all test workers via env
  process.env.__MONGODB_URI__ = mongod.getUri()
  return () => mongod.stop()
}
