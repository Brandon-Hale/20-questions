import { NextResponse } from 'next/server'
import { saveSession } from '@/lib/redis'
import { judgeGuess } from '@/lib/claude'
import { withSession, MAX_QUESTIONS } from '@/lib/withSession'
import type { GuessResponse, ApiError, HistoryEntry } from '@/lib/types'

interface GuessBody {
  sessionId?: unknown
  guess?: unknown
}

export async function POST(req: Request): Promise<NextResponse<GuessResponse | ApiError>> {
  return withSession<GuessBody, GuessResponse>(req, {
    textField: 'guess',
    requireQuestionsRemaining: false,
    handler: async ({ session, sessionId, body }) => {
      const guess = (body.guess as string).trim()
      const isFinalGuess = session.history.length >= MAX_QUESTIONS

      try {
        const correct = await judgeGuess(session.answer, guess)

        const newEntry: HistoryEntry = {
          type: 'guess',
          question: guess,
          answer: correct ? 'Correct!' : 'Wrong',
          correct,
        }
        const newHistory: HistoryEntry[] = [...session.history, newEntry]
        const gameOver = correct || isFinalGuess

        await saveSession(sessionId, { ...session, history: newHistory, gameOver, won: correct })

        const outOfQuestions = !correct && newHistory.length >= MAX_QUESTIONS

        return NextResponse.json({
          correct,
          questionsUsed: newHistory.length,
          questionsRemaining: MAX_QUESTIONS - newHistory.length,
          ...(gameOver && { gameOver: true as const, secretAnswer: session.answer }),
          ...(!gameOver && outOfQuestions && { finalGuess: true as const }),
        })
      } catch (err) {
        console.error('[POST /api/guess]', err)
        return NextResponse.json(
          { error: { code: 'INTERNAL', message: 'Failed to check guess. Try again.' } },
          { status: 500 },
        )
      }
    },
  })
}
