export interface ConfigurationEntity {
  _id: 'global_config'
  pro_price: number
  maintenance_mode: boolean
  maintenance_timeout_minutes: number
  created_at: Date
  updated_at: Date
}
