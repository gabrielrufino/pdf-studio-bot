import type { ObjectId } from 'mongodb'

export abstract class BaseEntity {
  _id!: ObjectId

  created_at: Date = new Date()

  updated_at: Date = new Date()

  protected assign(input?: Partial<any>) {
    Object.assign(this, input)
  }
}
