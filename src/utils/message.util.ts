export function splitMessage(text: string, maxLength = 4000): string[] {
  if (maxLength <= 0) {
    throw new RangeError('maxLength must be greater than 0')
  }

  const chunks: string[] = []
  let currentChunk = ''

  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (line.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = ''
      }
      let remainingLine = line
      while (remainingLine.length > maxLength) {
        chunks.push(remainingLine.slice(0, maxLength))
        remainingLine = remainingLine.slice(maxLength)
      }
      currentChunk = remainingLine
      continue
    }

    const addedLength = currentChunk ? line.length + 1 : line.length
    if (currentChunk.length + addedLength > maxLength) {
      chunks.push(currentChunk)
      currentChunk = line
    }
    else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}
