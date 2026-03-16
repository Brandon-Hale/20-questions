'use client'

interface Props {
  onStart: () => void
  gamesRemaining: number | null
  isLoading: boolean
  error: string | null
}

export default function StartScreen({ onStart, gamesRemaining, isLoading, error }: Props) {
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

        {gamesRemaining !== null && (
          <p className="text-xs text-stone-400 mb-4">
            <span className="font-semibold text-stone-600">{gamesRemaining}</span>{' '}
            game{gamesRemaining !== 1 ? 's' : ''} remaining today
          </p>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
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
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
          bg-yellow-400 text-yellow-900 hover:bg-yellow-300 active:scale-[0.97] transition-all"
      >
        <span>☕</span> Buy me a coffee
      </a>
    </div>
  )
}
