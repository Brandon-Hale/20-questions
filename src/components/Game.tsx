'use client'

import { useState } from 'react'
import { useGame } from '@/hooks/useGame'
import type { Difficulty } from '@/lib/types'
import StartScreen from './StartScreen'
import GameScreen from './GameScreen'
import ResultScreen from './ResultScreen'

export default function Game() {
  const game = useGame()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  if (game.status === 'idle') {
    return (
      <StartScreen
        onStart={() => game.start(difficulty)}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        gamesRemaining={game.gamesRemaining}
        isLoading={game.isLoading}
        error={game.error}
      />
    )
  }

  if (game.status === 'won' || game.status === 'lost') {
    return (
      <ResultScreen
        status={game.status}
        secretAnswer={game.secretAnswer}
        questionsUsed={game.questionsUsed}
        gamesRemaining={game.gamesRemaining}
        onPlayAgain={() => game.start(difficulty)}
        onReset={game.reset}
      />
    )
  }

  return (
    <GameScreen
      status={game.status}
      secret={game.secret}
      history={game.history}
      questionsUsed={game.questionsUsed}
      hintsRemaining={game.hintsRemaining}
      isLoading={game.isLoading}
      error={game.error}
      onAsk={game.ask}
      onHint={game.hint}
      onGuess={game.guess}
      onReset={game.reset}
    />
  )
}
