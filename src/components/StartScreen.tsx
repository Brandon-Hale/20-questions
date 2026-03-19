'use client'

import type { Difficulty } from '@/lib/types'

const DIFFICULTIES: { value: Difficulty; label: string; description: string; colour: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Obvious picks', colour: 'bg-green-500' },
  { value: 'medium', label: 'Medium', description: 'Recognisable', colour: 'bg-amber-400' },
  { value: 'hard', label: 'Hard', description: 'Specific knowledge', colour: 'bg-orange-500' },
  { value: 'extreme', label: 'Extreme', description: 'Trivia expert', colour: 'bg-red-500' },
]

interface Props {
  onStart: () => void
  difficulty: Difficulty
  onDifficultyChange: (d: Difficulty) => void
  gamesRemaining: number | null
  isLoading: boolean
  error: string | null
}

export default function StartScreen({ onStart, difficulty, onDifficultyChange, gamesRemaining, isLoading, error }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-12 text-center select-none">
        <div
          className="text-8xl font-extrabold tracking-tight leading-none mb-2 text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          20
        </div>
        <div className="text-lg font-medium tracking-[0.3em] uppercase text-stone-400">
          Questions
        </div>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
        <p className="text-stone-500 text-sm leading-relaxed mb-6">
          I&apos;m thinking of something — a person, a place, or an object. You have{' '}
          <span className="font-semibold text-stone-800">20 yes/no questions</span> to figure it out.
        </p>

        {/* Difficulty selector */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3" id="difficulty-label">Difficulty</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="difficulty-label">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                role="radio"
                aria-checked={difficulty === d.value}
                onClick={() => onDifficultyChange(d.value)}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer border
                  ${difficulty === d.value
                    ? 'border-stone-900 bg-stone-50 shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
              >
                <span className={`w-3 h-3 shrink-0 rounded-full ${d.colour}`} aria-hidden="true" />
                <div>
                  <span className={`text-sm font-bold block ${difficulty === d.value ? 'text-stone-900' : 'text-stone-500'}`}>
                    {d.label}
                  </span>
                  <span className="text-[11px] text-stone-400 leading-tight">{d.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {gamesRemaining !== null && (
          <p className="text-xs text-stone-400 mb-4">
            <span className="font-semibold text-stone-600">{gamesRemaining}</span>{' '}
            game{gamesRemaining !== 1 ? 's' : ''} remaining today
          </p>
        )}

        {error && (
          <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <button
          onClick={onStart}
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer
            bg-stone-900 text-white hover:bg-stone-700 active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Starting…' : 'Play'}
        </button>
      </div>

      <p className="mt-6 text-xs text-stone-400">3 free games per day · No sign-up needed</p>

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
  )
}
