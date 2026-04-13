import process from 'node:process'
import { GoogleGenAI } from '@google/genai'

export const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
})
