import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ConfigurationRepository } from './src/repositories/configuration.repository'

async function run() {
  const mongod = await MongoMemoryServer.create()
  const client = new MongoClient(mongod.getUri())
  await client.connect()
  const database = client.db('pdf_studio_test')
  const configurationRepository = new ConfigurationRepository(database)
  await configurationRepository.init()

  const start = Date.now()
  for (let i = 0; i < 10000; i++) {
    await configurationRepository.findGlobalConfig()
  }
  const end = Date.now()
  console.log(`Baseline: Took ${end - start} ms`)

  await client.close()
  await mongod.stop()
}

run()
