import { describe, expect, it } from 'vitest'
import { InvalidFileError } from './invalid-file.error'
import { LimitExceededError } from './limit-exceeded.error'
import { SessionValidationError } from './session-validation.error'
import { UserNotFoundError } from './user-not-found.error'

describe('custom errors', () => {
  describe(InvalidFileError.name, () => {
    it('should have correct message and name', () => {
      const error = new InvalidFileError()
      expect(error.message).toBe('Invalid file type.')
      expect(error.name).toBe('InvalidFileError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe(LimitExceededError.name, () => {
    it('should have correct message and name', () => {
      const error = new LimitExceededError()
      expect(error.message).toBe('Limit exceeded.')
      expect(error.name).toBe('LimitExceededError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe(SessionValidationError.name, () => {
    it('should have correct message and name', () => {
      const error = new SessionValidationError()
      expect(error.message).toBe('An error occurred. Please start the command again.')
      expect(error.name).toBe('SessionValidationError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe(UserNotFoundError.name, () => {
    it('should have correct message and name', () => {
      const error = new UserNotFoundError()
      expect(error.message).toBe('User not found.')
      expect(error.name).toBe('UserNotFoundError')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
