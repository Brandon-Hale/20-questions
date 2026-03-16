'use client'

import { useState, useRef, useEffect } from 'react'
import type { GameStatus } from '@/hooks/useGame'
import type { Category, Article, HistoryEntry, YesNoAnswer, GuessResult } from '@/lib/types'

const ANSWER_COLOURS: Record<YesNoAnswer | GuessResult, string> = {
  Yes: 'bg-green-50 text-green-700 border-green-200',
  No: 'bg-red-50 text-red-600 border-red-200',
  Sometimes: 'bg-amber-50 text-amber-700 border-amber-200',
  'Sort of': 'bg-amber-50 text-amber-700 border-amber-200',
  'Correct!': 'bg-green-50 text-green-700 border-green-200',
  Wrong: 'bg-red-50 text-red-500 border-red-200',
}

const SUGGESTIONS = [
  'Is it a living thing?',
  'Is it man-made?',
  'Can you hold it?',
  'Is it bigger than a car?',
  'Is it a famous person?',
  'Can you eat it?',
  'Is it found indoors?',
  'Does it make a sound?',
]

function AnswerBadge({ answer }: { answer: HistoryEntry['answer'] }) {
  const style = ANSWER_COLOURS[answer as keyof typeof ANSWER_COLOURS] ?? 'bg-stone-100 text-stone-600 border-stone-200'
  return (
    <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {answer}
    </span>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-3">
      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block dot-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block dot-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block dot-3" />
    </div>
  )
}

interface Props {
  status: GameStatus
  secret: { category: Category; article: Article } | null
  history: HistoryEntry[]
  questionsUsed: number
  isLoading: boolean
  error: string | null
  onAsk: (q: string) => void
  onGuess: (g: string) => void
  onReset: () => void
}

type InputMode = 'ask' | 'guess'

export default function GameScreen({
  status,
  secret,
  history,
  questionsUsed,
  isLoading,
  error,
  onAsk,
  onGuess,
  onReset,
}: Props) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<InputMode>('ask')
  const historyEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = 20 - questionsUsed
  const isActive = status === 'playing'
  const canSubmit = isActive && input.trim().length > 0

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, isLoading])

  useEffect(() => {
    if (status === 'playing') inputRef.current?.focus()
  }, [status])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const val = input.trim()
    setInput('')
    mode === 'ask' ? onAsk(val) : onGuess(val)
  }

  function switchMode(m: InputMode) {
    setMode(m)
    setInput('')
    inputRef.current?.focus()
  }

  const counterColour =
    remaining > 13 ? 'text-green-600' : remaining > 6 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-4">
      {/* Header */}
      <header className="flex items-center justify-between py-5 border-b border-stone-200">
        <button
          onClick={onReset}
          className="text-xs font-semibold uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          ← New Game
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          20 Questions
        </span>
        <div className="text-right">
          <div
            className={`text-2xl font-bold tabular-nums leading-none ${counterColour}`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {String(remaining).padStart(2, '0')}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">left</div>
        </div>
      </header>

      {/* Category hint */}
      {secret && (
        <div className="pt-4 pb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Category:{' '}
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-stone-600">
            {secret.category}
          </span>
        </div>
      )}

      {/* Loading secret */}
      {status === 'loading_secret' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-400 text-sm">
          <span>I&apos;m thinking of something…</span>
          <LoadingDots />
        </div>
      )}

      {/* History */}
      {(history.length > 0 || (isLoading && status !== 'loading_secret')) && (
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          {history.map((item, i) => (
            <div key={i} className="fade-slide-up flex items-start gap-3">
              <span
                className="text-xs font-medium text-stone-300 tabular-nums mt-[3px] shrink-0 w-6 text-right"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 flex items-start justify-between gap-3 py-2.5 border-b border-stone-100">
                <span className="text-sm text-stone-700 leading-snug">
                  {item.type === 'guess' && (
                    <span className="text-stone-300 text-xs uppercase tracking-widest font-semibold mr-2">
                      Guess
                    </span>
                  )}
                  {item.question}
                </span>
                <AnswerBadge answer={item.answer} />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3 fade-slide-up">
              <span
                className="text-xs font-medium text-stone-300 tabular-nums mt-[3px] shrink-0 w-6 text-right"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {String(questionsUsed + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 py-1">
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={historyEndRef} />
        </div>
      )}

      {/* Empty state — suggestion chips */}
      {history.length === 0 && !isLoading && status === 'playing' && (
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm text-stone-400 mb-4">Start broad:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s)
                  setMode('ask')
                  inputRef.current?.focus()
                }}
                className="px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-600
                  hover:border-stone-400 hover:text-stone-900 transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && status === 'playing' && <div className="min-h-4" />}

      {/* Error */}
      {error && (
        <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Input */}
      {(status === 'playing' || isLoading) && (
        <div className="py-4 mb-2 border-t border-stone-200">
          <div className="flex gap-1 mb-3 bg-stone-100 rounded-xl p-1">
            {(['ask', 'guess'] as InputMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all cursor-pointer
                  ${mode === m
                    ? m === 'guess'
                      ? 'bg-amber-400 text-amber-900 shadow-sm'
                      : 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-400 hover:text-stone-700'
                  }`}
              >
                {m === 'ask' ? 'Ask a Question' : 'Make a Guess'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isActive}
              placeholder={
                mode === 'ask'
                  ? 'Ask a yes/no question…'
                  : `I think it's ${secret?.article ?? 'a'}…`
              }
              className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm
                outline-none focus:border-stone-400 transition-all placeholder-stone-300
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer
                ${
                  canSubmit
                    ? mode === 'guess'
                      ? 'bg-amber-400 text-amber-900 hover:bg-amber-300 active:scale-95'
                      : 'bg-stone-900 text-white hover:bg-stone-700 active:scale-95'
                    : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                }`}
            >
              {mode === 'ask' ? 'Ask' : 'Guess!'}
            </button>
          </form>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
        <span>Powered by Claude</span>
        <a
          href="https://buymeacoffee.com/brandon.hale"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-stone-600 transition-colors"
        >
          ☕ Buy me a coffee
        </a>
      </footer>
    </div>
  )
}
