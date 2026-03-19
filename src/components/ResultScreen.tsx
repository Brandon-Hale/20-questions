'use client'

import type { GameStatus } from '@/hooks/useGame'

interface Props {
  status: GameStatus
  secretAnswer: string | null
  questionsUsed: number
  gamesRemaining: number | null
  onPlayAgain: () => void
  onReset: () => void
}

export default function ResultScreen({
  status,
  secretAnswer,
  questionsUsed,
  gamesRemaining,
  onPlayAgain,
  onReset,
}: Props) {
  const won = status === 'won'
  const noGamesLeft = gamesRemaining !== null && gamesRemaining <= 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-6xl" aria-hidden="true">{won ? '🎉' : '💀'}</div>

        <div
          className={`text-4xl font-extrabold mb-2 ${won ? 'text-green-600' : 'text-red-500'}`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {won ? 'You got it!' : 'Game over'}
        </div>

        <p className="text-stone-500 text-sm mb-1">
          {won ? 'It was indeed' : 'I was thinking of'}
        </p>
        <div
          className="text-3xl font-bold text-stone-900 mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {secretAnswer ?? '—'}
        </div>

        <div className="flex justify-center gap-8 mb-8 py-4 border-y border-stone-200" aria-label="Game statistics">
          <div className="text-center" aria-label={`${questionsUsed} questions used`}>
            <div
              className="text-3xl font-bold tabular-nums text-stone-900"
              style={{ fontFamily: 'var(--font-mono)' }}
              aria-hidden="true"
            >
              {questionsUsed}
            </div>
            <div className="text-xs uppercase tracking-widest text-stone-400 mt-0.5" aria-hidden="true">
              Questions
            </div>
          </div>
          <div className="text-center" aria-label={`${20 - questionsUsed} questions remaining`}>
            <div
              className="text-3xl font-bold tabular-nums text-stone-900"
              style={{ fontFamily: 'var(--font-mono)' }}
              aria-hidden="true"
            >
              {20 - questionsUsed}
            </div>
            <div className="text-xs uppercase tracking-widest text-stone-400 mt-0.5" aria-hidden="true">
              Remaining
            </div>
          </div>
        </div>

        {noGamesLeft ? (
          <div className="mb-4 px-4 py-3 bg-stone-100 rounded-xl text-sm text-stone-500">
            No games remaining today. Come back tomorrow!
          </div>
        ) : (
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 mb-3 rounded-xl font-semibold text-sm tracking-wide
              bg-stone-900 text-white hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            Play Again
            {gamesRemaining !== null && (
              <span className="ml-1.5 opacity-60">({gamesRemaining} left today)</span>
            )}
          </button>
        )}

        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl font-semibold text-sm border border-stone-200
            text-stone-500 hover:text-stone-800 hover:border-stone-400 transition-all cursor-pointer"
        >
          Home
        </button>

        <a
          href="https://buymeacoffee.com/brandon.hale"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            bg-yellow-400 text-yellow-900 hover:bg-yellow-300 active:scale-[0.97] transition-all"
        >
          <span aria-hidden="true">☕</span> Buy me a coffee
        </a>
      </div>
    </div>
  )
}
