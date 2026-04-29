import type { Difficulty, StartResponse, AskResponse, HintResponse, GuessResponse, ResumeResponse, ApiError } from './types'

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as T | ApiError

  if (!res.ok) {
    const err = data as ApiError
    const error = new Error(err.error?.message ?? `Request failed (${res.status})`) as Error & {
      code: string
      status: number
    }
    error.code = err.error?.code ?? 'UNKNOWN'
    error.status = res.status
    throw error
  }

  return data as T
}

export const startGame = (difficulty: Difficulty): Promise<StartResponse> =>
  post('/api/start', { difficulty })

export const askQuestion = (sessionId: string, question: string): Promise<AskResponse> =>
  post('/api/ask', { sessionId, question })

export const requestHint = (sessionId: string): Promise<HintResponse> =>
  post('/api/hint', { sessionId })

export const makeGuess = (sessionId: string, guess: string): Promise<GuessResponse> =>
  post('/api/guess', { sessionId, guess })

export const resumeGame = (sessionId: string): Promise<ResumeResponse> =>
  post('/api/session', { sessionId })
