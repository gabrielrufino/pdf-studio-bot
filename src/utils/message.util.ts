export function splitMessage(text: string, maxLength = 4000): string[] {
  const chunks: string[] = []
  let currentChunk = ''

  const lines = text.split('\n')
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

    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
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
