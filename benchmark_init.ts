import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { BaseRepository } from './src/repositories/base.repository'
import { performance } from 'perf_hooks'

async function runBenchmark() {
  const mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  const client = new MongoClient(uri)
  await client.connect()

  const db = client.db('benchmark_db')
  const indexes = Array.from({ length: 50 }, (_, i) => `field_${i}`)

  class BenchmarkRepository extends BaseRepository<any> {
    constructor(database: any) {
      super({
        collectionName: 'benchmark_col',
        database,
        validator: { $jsonSchema: { bsonType: 'object' } },
        indexes,
      })
    }
  }

  const runs = 5;
  let totalTime = 0;

  for (let i = 0; i < runs; i++) {
    // Drop collection if exists for clean state
    try {
      await db.collection('benchmark_col').drop();
    } catch (e) {}

    const repo = new BenchmarkRepository(db)

    const start = performance.now()
    await repo.init()
    const end = performance.now()

    totalTime += (end - start);
    console.log(`Run ${i + 1}: Initialization with ${indexes.length} indexes took ${end - start} ms`)
  }

  console.log(`Average time: ${totalTime / runs} ms`);

  await client.close()
  await mongod.stop()
}

runBenchmark().catch(console.error)
