import process from 'node:process'

import { MongoClient } from 'mongodb'

export const mongoClient = new MongoClient(process.env.MONGODB_CONNECTION_STRING!)
export const database = mongoClient.db('pdf_studio')
