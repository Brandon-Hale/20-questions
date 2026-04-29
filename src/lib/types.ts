export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'
export type Category = 'person' | 'place' | 'object'
export type Article = 'a' | 'an'
export type YesNoAnswer = 'Yes' | 'No' | 'Sometimes' | 'Sort of' | 'Invalid'
export type GuessResult = 'Correct!' | 'Wrong'

export interface HistoryEntry {
  type: 'question' | 'guess' | 'hint'
  question: string
  answer: YesNoAnswer | GuessResult | string
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
  finalGuess?: true
  secretAnswer?: string
  /** True when Claude judged the question to be a correct identification of the secret. */
  won?: true
}

export interface HintResponse {
  hint: string
  questionsUsed: number
  questionsRemaining: number
  hintsRemaining: number
  finalGuess?: true
}

export interface GuessResponse {
  correct: boolean
  questionsUsed: number
  questionsRemaining: number
  gameOver?: true
  finalGuess?: true
  secretAnswer?: string
}
