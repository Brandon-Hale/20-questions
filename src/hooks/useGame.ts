'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { startGame as apiStart, askQuestion as apiAsk, requestHint as apiHint, makeGuess as apiGuess, resumeGame as apiResume } from '@/lib/api'
import type { Difficulty, Category, Article, HistoryEntry } from '@/lib/types'

const STORAGE_KEY = '20q.sessionId'

export type GameStatus =
  | 'idle'
  | 'loading_secret'
  | 'resuming'
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

function readStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredSessionId(id: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage can be unavailable (private mode quotas, etc.) — ignore.
  }
}

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const resumeAttempted = useRef(false)

  const questionsUsed = state.history.length
  const isLoading =
    state.status === 'loading_secret' ||
    state.status === 'resuming' ||
    state.status === 'answering' ||
    state.status === 'hinting' ||
    state.status === 'checking'

  // Try to resume an in-flight session on mount.
  useEffect(() => {
    if (resumeAttempted.current) return
    resumeAttempted.current = true

    const stored = readStoredSessionId()
    if (!stored) return

    let cancelled = false
    setState((prev) => ({ ...prev, status: 'resuming' }))
    apiResume(stored)
      .then((data) => {
        if (cancelled) return
        setState({
          status: data.finalGuess ? 'final_guess' : 'playing',
          sessionId: data.sessionId,
          secret: { category: data.category, article: data.article },
          secretAnswer: null,
          history: data.history,
          error: null,
          gamesRemaining: data.gamesRemaining,
          hintsRemaining: data.hintsRemaining,
        })
      })
      .catch(() => {
        if (cancelled) return
        // Stale or expired sessionId — clear and stay on idle.
        writeStoredSessionId(null)
        setState((prev) => ({ ...prev, status: 'idle' }))
      })

    return () => {
      cancelled = true
    }
  }, [])

  const start = useCallback(async (difficulty: Difficulty = 'medium') => {
    setState((prev) => ({
      ...INITIAL_STATE,
      gamesRemaining: prev.gamesRemaining,
      status: 'loading_secret',
    }))
    try {
      const data = await apiStart(difficulty)
      writeStoredSessionId(data.sessionId)
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

        if (data.won) writeStoredSessionId(null)

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
        if (status === 'won' || status === 'lost') writeStoredSessionId(null)
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
    writeStoredSessionId(null)
    setState((prev) => ({ ...INITIAL_STATE, gamesRemaining: prev.gamesRemaining }))
  }, [])

  return { ...state, questionsUsed, isLoading, start, ask, hint, guess, reset }
}
