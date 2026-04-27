import process from 'node:process'
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GOOGLE_GENAI_API_KEY

if (!apiKey) {
  throw new Error('GOOGLE_GENAI_API_KEY is not set')
}

export const ai = new GoogleGenAI({
  apiKey,
})
