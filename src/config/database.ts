import process from 'node:process'

import { MongoClient } from 'mongodb'

export const database = new MongoClient(process.env.MONGODB_CONNECTION_STRING!)
  .db('pdf_studio')
