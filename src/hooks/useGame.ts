'use client'

import { useState, useCallback } from 'react'
import { startGame as apiStart, askQuestion as apiAsk, requestHint as apiHint, makeGuess as apiGuess } from '@/lib/api'
import type { Difficulty, Category, Article, HistoryEntry } from '@/lib/types'

export type GameStatus =
  | 'idle'
  | 'loading_secret'
  | 'playing'
  | 'answering'
  | 'hinting'
  | 'checking'
  | 'final_guess'
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
  hintsRemaining: number
}

const INITIAL_STATE: GameState = {
  status: 'idle',
  sessionId: null,
  secret: null,
  secretAnswer: null,
  history: [],
  error: null,
  gamesRemaining: null,
  hintsRemaining: 3,
}

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)

  const questionsUsed = state.history.length
  const isLoading =
    state.status === 'loading_secret' ||
    state.status === 'answering' ||
    state.status === 'hinting' ||
    state.status === 'checking'

  const start = useCallback(async (difficulty: Difficulty = 'medium') => {
    setState((prev) => ({
      ...INITIAL_STATE,
      gamesRemaining: prev.gamesRemaining,
      status: 'loading_secret',
    }))
    try {
      const data = await apiStart(difficulty)
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
        const newEntry: HistoryEntry = data.won
          ? { type: 'guess', question, answer: 'Correct!', correct: true }
          : { type: 'question', question, answer: data.answer }

        const nextStatus: GameStatus = data.won
          ? 'won'
          : data.finalGuess
            ? 'final_guess'
            : 'playing'

        setState((prev) => ({
          ...prev,
          history: [...prev.history, newEntry],
          status: nextStatus,
          secretAnswer: data.secretAnswer ?? prev.secretAnswer,
          ...(!data.won && data.answer === 'Invalid' && { error: 'That wasn\'t a valid yes/no question — it still cost you a question!' }),
        }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong'
        setState((prev) => ({ ...prev, status: 'playing', error: msg }))
      }
    },
    [state.sessionId],
  )

  const hint = useCallback(
    async () => {
      if (!state.sessionId) return
      setState((prev) => ({ ...prev, status: 'hinting', error: null }))
      try {
        const data = await apiHint(state.sessionId)
        setState((prev) => ({
          ...prev,
          history: [...prev.history, { type: 'hint', question: 'Hint', answer: data.hint }],
          hintsRemaining: data.hintsRemaining,
          status: data.finalGuess ? 'final_guess' : 'playing',
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
        const status: GameStatus = data.correct ? 'won' : data.gameOver ? 'lost' : data.finalGuess ? 'final_guess' : 'playing'
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
        const fallbackStatus: GameStatus = state.status === 'checking' && state.history.length >= 20 ? 'final_guess' : 'playing'
        setState((prev) => ({ ...prev, status: fallbackStatus, error: msg }))
      }
    },
    [state.sessionId, state.status, state.history.length],
  )

  const reset = useCallback(() => {
    setState((prev) => ({ ...INITIAL_STATE, gamesRemaining: prev.gamesRemaining }))
  }, [])

  return { ...state, questionsUsed, isLoading, start, ask, hint, guess, reset }
}
