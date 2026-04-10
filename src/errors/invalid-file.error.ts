export class InvalidFileError extends Error {
  constructor() {
    super('Invalid file type.')
    this.name = 'InvalidFileError'
  }
}
