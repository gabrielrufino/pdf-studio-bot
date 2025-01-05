import process from 'node:process'
import { MikroORM } from '@mikro-orm/mongodb'
import { UserEntity } from '../entities/user.entity'

export const orm = MikroORM.initSync({
  clientUrl: process.env.MONGODB_CONNECTION_STRING!,
  dbName: 'production',
  entities: [UserEntity],
})
