import OpenAI from 'openai'

// OpenAI client — only instantiated when VITE_OPENAI_API_KEY is set.
// All AI features gracefully degrade when the key is absent.
const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

export const openaiClient: OpenAI | null = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // client-side usage; key should be restricted in OpenAI dashboard
    })
  : null

export const AI_MODEL = 'gpt-4o-mini'
export const AI_ENABLED = !!apiKey
