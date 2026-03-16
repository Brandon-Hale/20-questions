'use client'

import { useGame } from '@/hooks/useGame'
import StartScreen from './StartScreen'
import GameScreen from './GameScreen'
import ResultScreen from './ResultScreen'

export default function Game() {
  const game = useGame()

  if (game.status === 'idle') {
    return (
      <StartScreen
        onStart={game.start}
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
        onPlayAgain={game.start}
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
      isLoading={game.isLoading}
      error={game.error}
      onAsk={game.ask}
      onGuess={game.guess}
      onReset={game.reset}
    />
  )
}
