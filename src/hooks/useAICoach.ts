import { useState, useCallback } from 'react'
import { openaiClient, AI_MODEL, AI_ENABLED } from '@/lib/openai'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BDContext {
  memberName: string
  role: string
  todayDate: string
  profilesCount: number
  filledToday: number
  totalActionsToday: number
  leadsCount: number
  activeTargets: { metric: string; current: number; target: number; pct: number }[]
  platformsSummary: string
  recentActivity?: string
}

function buildSystemPrompt(ctx: BDContext): string {
  const targetsText =
    ctx.activeTargets.length > 0
      ? ctx.activeTargets
          .map(
            (t) =>
              `  - ${t.metric.replace(/_/g, ' ')}: ${t.current}/${t.target} (${t.pct.toFixed(0)}%)`
          )
          .join('\n')
      : '  None set'

  return `You are a focused, concise Business Development coach embedded inside a BD management app.
You help ${ctx.memberName} (${ctx.role}) improve their outreach, lead quality, and daily efficiency.

Today is ${ctx.todayDate}.
Current status:
- Profiles assigned: ${ctx.profilesCount}
- Profiles filled today: ${ctx.filledToday}/${ctx.profilesCount}
- Total actions logged today: ${ctx.totalActionsToday}
- Active leads: ${ctx.leadsCount}
- Platforms: ${ctx.platformsSummary}

Target progress:
${targetsText}

${ctx.recentActivity ? `Recent activity note: ${ctx.recentActivity}` : ''}

Rules:
- Be direct and practical. Max 3 sentences unless asked to elaborate.
- Give specific, actionable advice (e.g. "Send 5 more proposals to hit your daily target" not "Work harder").
- When asked about strategy, tailor advice to Upwork/LinkedIn/Cold Email best practices.
- Never make up numbers — use only the data above.
- If you notice a pattern (low response rate, behind on targets), proactively mention it.`
}

export function useAICoach(ctx: BDContext | null) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!AI_ENABLED || !openaiClient || !ctx) {
        setError('AI assistant is not configured. Add VITE_OPENAI_API_KEY to your .env file.')
        return
      }
      if (!userText.trim()) return

      const newUserMsg: AIMessage = { role: 'user', content: userText.trim() }
      const updatedMessages = [...messages, newUserMsg]
      setMessages(updatedMessages)
      setIsLoading(true)
      setError(null)

      try {
        const completion = await openaiClient.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            { role: 'system', content: buildSystemPrompt(ctx) },
            ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        })

        const reply = completion.choices[0]?.message?.content ?? 'No response.'
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI request failed'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [ctx, messages]
  )

  const askQuickInsight = useCallback(
    async (prompt: string) => {
      if (!AI_ENABLED || !openaiClient || !ctx) return null
      try {
        const completion = await openaiClient.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 120,
          temperature: 0.5,
          messages: [
            { role: 'system', content: buildSystemPrompt(ctx) },
            { role: 'user', content: prompt },
          ],
        })
        return completion.choices[0]?.message?.content ?? null
      } catch {
        return null
      }
    },
    [ctx]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    askQuickInsight,
    clearChat,
    isEnabled: AI_ENABLED,
  }
}
