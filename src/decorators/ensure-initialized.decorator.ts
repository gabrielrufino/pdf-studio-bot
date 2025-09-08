import type { BaseRepository } from '../repositories/base.repository'

export function EnsureInitialized(target: BaseRepository<any>, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (this: BaseRepository<any>, ...args: any[]) {
    if (!this.initialized) {
      await this.init()
    }

    return originalMethod.apply(this, args)
  }

  return descriptor
}
