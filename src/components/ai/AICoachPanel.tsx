import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, RotateCcw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAICoach, type BDContext } from '@/hooks/useAICoach'

interface AICoachPanelProps {
  context: BDContext | null
  /** Quick-prompts shown as chips above the input */
  quickPrompts?: string[]
}

const DEFAULT_QUICK_PROMPTS = [
  'How am I tracking vs my targets?',
  'Tips to improve my response rate',
  'Best time to send cold emails?',
  'How do I write a winning Upwork proposal?',
  'What should I focus on right now?',
]

export const AICoachPanel = React.memo(function AICoachPanel({
  context,
  quickPrompts = DEFAULT_QUICK_PROMPTS,
}: AICoachPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const [showPrompts, setShowPrompts] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isLoading, error, sendMessage, clearChat, isEnabled } = useAICoach(context)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen, isMinimized])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    setShowPrompts(false)
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setShowPrompts(false)
    void sendMessage(prompt)
  }

  // Floating trigger button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          aria-label="Open AI Coach"
        >
          <Bot className="size-6" aria-hidden />
        </Button>
        {!isEnabled && (
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-yellow-500" />
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border bg-card shadow-2xl transition-all duration-200',
        isMinimized ? 'h-14 w-72' : 'h-[520px] w-[380px]'
      )}
      role="dialog"
      aria-label="AI Coach"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 rounded-t-2xl border-b bg-primary px-4 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden />
          <span className="text-sm font-semibold">AI Coach</span>
          {isEnabled ? (
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0">
              GPT-4o mini
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500/80 text-white text-[10px] px-1.5 py-0">
              No API key
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={clearChat}
              aria-label="Clear chat"
            >
              <RotateCcw className="size-3.5" aria-hidden />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => setIsMinimized((m) => !m)}
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="size-3.5" aria-hidden /> : <Minimize2 className="size-3.5" aria-hidden />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => setIsOpen(false)}
            aria-label="Close AI Coach"
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Message area */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bot className="mb-3 size-10 text-muted-foreground/40" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">
                  {isEnabled ? "Hi! I'm your BD Coach." : 'AI Coach (no API key configured)'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {isEnabled
                    ? 'Ask me anything about your targets, strategy, or daily workflow.'
                    : 'Add VITE_OPENAI_API_KEY to your .env to enable AI features.'}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm bg-muted text-foreground'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5">
                  <div className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {showPrompts && messages.length === 0 && isEnabled && (
            <div className="border-t px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Quick questions
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5"
                  onClick={() => setShowPrompts(false)}
                  aria-label="Hide quick prompts"
                >
                  <ChevronDown className="size-3" aria-hidden />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleQuickPrompt(p)}
                    className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isEnabled ? 'Ask your coach…' : 'AI not configured'}
                disabled={!isEnabled || isLoading}
                rows={1}
                className="min-h-[40px] resize-none rounded-xl border-muted-foreground/30 text-sm"
                aria-label="Message to AI coach"
              />
              <Button
                size="icon"
                className="size-10 shrink-0 rounded-xl"
                onClick={() => void handleSend()}
                disabled={!isEnabled || !input.trim() || isLoading}
                aria-label="Send message"
              >
                <Send className="size-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </>
      )}
    </div>
  )
})
