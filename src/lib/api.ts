import type { StartResponse, AskResponse, GuessResponse, ApiError } from './types'

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

export const startGame = (): Promise<StartResponse> => post('/api/start', {})

export const askQuestion = (sessionId: string, question: string): Promise<AskResponse> =>
  post('/api/ask', { sessionId, question })

export const makeGuess = (sessionId: string, guess: string): Promise<GuessResponse> =>
  post('/api/guess', { sessionId, guess })
