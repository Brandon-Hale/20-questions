export type Category = 'person' | 'place' | 'object'
export type Article = 'a' | 'an'
export type YesNoAnswer = 'Yes' | 'No' | 'Sometimes' | 'Sort of'
export type GuessResult = 'Correct!' | 'Wrong'

export interface HistoryEntry {
  type: 'question' | 'guess'
  question: string
  answer: YesNoAnswer | GuessResult
  correct?: boolean
}

/** Stored in Redis — the secret never leaves the server */
export interface GameSession {
  answer: string
  category: Category
  article: Article
  history: HistoryEntry[]
  gameOver: boolean
  won: boolean
}

/** Shape returned to the client — no answer field */
export interface SessionMeta {
  sessionId: string
  category: Category
  article: Article
  gamesRemaining: number
}

export interface ApiError {
  error: { code: string; message: string }
}

// Route response types
export interface StartResponse extends SessionMeta {}

export interface AskResponse {
  answer: YesNoAnswer
  questionsUsed: number
  questionsRemaining: number
  gameOver?: true
  secretAnswer?: string
}

export interface GuessResponse {
  correct: boolean
  questionsUsed: number
  questionsRemaining: number
  gameOver?: true
  secretAnswer?: string
}
