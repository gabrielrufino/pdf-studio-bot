import type { ObjectId } from 'mongodb'
import type { CurrencyEnum } from '../enums/currency.enum'
import { BaseEntity } from './base.entity'

export class PaymentEntity extends BaseEntity {
  constructor(input?: Partial<PaymentEntity>) {
    super()
    this.assign(input)
  }

  user_id!: ObjectId

  amount!: number

  currency!: CurrencyEnum
}
