'use client'

import { useState, useCallback } from 'react'
import { startGame as apiStart, askQuestion as apiAsk, makeGuess as apiGuess } from '@/lib/api'
import type { Category, Article, HistoryEntry } from '@/lib/types'

export type GameStatus =
  | 'idle'
  | 'loading_secret'
  | 'playing'
  | 'answering'
  | 'checking'
  | 'won'
  | 'lost'

interface GameState {
  status: GameStatus
  sessionId: string | null
  secret: { category: Category; article: Article } | null
  secretAnswer: string | null
  history: HistoryEntry[]
  error: string | null
  gamesRemaining: number | null
}

const INITIAL_STATE: GameState = {
  status: 'idle',
  sessionId: null,
  secret: null,
  secretAnswer: null,
  history: [],
  error: null,
  gamesRemaining: null,
}

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)

  const questionsUsed = state.history.length
  const isLoading =
    state.status === 'loading_secret' ||
    state.status === 'answering' ||
    state.status === 'checking'

  const start = useCallback(async () => {
    setState((prev) => ({
      ...INITIAL_STATE,
      gamesRemaining: prev.gamesRemaining,
      status: 'loading_secret',
    }))
    try {
      const data = await apiStart()
      setState((prev) => ({
        ...prev,
        status: 'playing',
        sessionId: data.sessionId,
        secret: { category: data.category, article: data.article },
        gamesRemaining: data.gamesRemaining,
        error: null,
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setState((prev) => ({ ...prev, status: 'idle', error: msg }))
    }
  }, [])

  const ask = useCallback(
    async (question: string) => {
      if (!state.sessionId) return
      setState((prev) => ({ ...prev, status: 'answering', error: null }))
      try {
        const data = await apiAsk(state.sessionId, question)
        setState((prev) => ({
          ...prev,
          history: [...prev.history, { type: 'question', question, answer: data.answer }],
          status: data.gameOver ? 'lost' : 'playing',
          secretAnswer: data.secretAnswer ?? prev.secretAnswer,
        }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong'
        setState((prev) => ({ ...prev, status: 'playing', error: msg }))
      }
    },
    [state.sessionId],
  )

  const guess = useCallback(
    async (guessText: string) => {
      if (!state.sessionId) return
      setState((prev) => ({ ...prev, status: 'checking', error: null }))
      try {
        const data = await apiGuess(state.sessionId, guessText)
        const status: GameStatus = data.correct ? 'won' : data.gameOver ? 'lost' : 'playing'
        setState((prev) => ({
          ...prev,
          history: [
            ...prev.history,
            {
              type: 'guess',
              question: guessText,
              answer: data.correct ? 'Correct!' : 'Wrong',
              correct: data.correct,
            },
          ],
          status,
          secretAnswer: data.secretAnswer ?? prev.secretAnswer,
        }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong'
        setState((prev) => ({ ...prev, status: 'playing', error: msg }))
      }
    },
    [state.sessionId],
  )

  const reset = useCallback(() => {
    setState((prev) => ({ ...INITIAL_STATE, gamesRemaining: prev.gamesRemaining }))
  }, [])

  return { ...state, questionsUsed, isLoading, start, ask, guess, reset }
}
