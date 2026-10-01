import { PlanTypeEnum } from '../enums/plan-type.enum'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_PAGES = 50

export const MAX_PRO_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_PRO_PAGES = 1000

export const DAILY_LIMITS = {
  [PlanTypeEnum.Free]: 3,
  [PlanTypeEnum.Pro]: 50,
}
