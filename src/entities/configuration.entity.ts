import { BaseEntity } from './base.entity'

export class ConfigurationEntity extends BaseEntity {
  constructor(input?: Partial<ConfigurationEntity>) {
    super()
    this.assign(input)
  }

  key!: string

  value!: string
}
