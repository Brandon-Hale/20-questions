import { NextResponse } from 'next/server'
import { saveSession } from '@/lib/redis'
import { answerQuestion } from '@/lib/claude'
import { withSession, MAX_QUESTIONS } from '@/lib/withSession'
import type { AskResponse, ApiError, HistoryEntry } from '@/lib/types'

interface AskBody {
  sessionId?: unknown
  question?: unknown
}

export async function POST(req: Request): Promise<NextResponse<AskResponse | ApiError>> {
  return withSession<AskBody, AskResponse>(req, {
    textField: 'question',
    handler: async ({ session, sessionId, body }) => {
      const question = (body.question as string).trim()

      try {
        const answer = await answerQuestion(
          { answer: session.answer, category: session.category },
          question,
          session.history,
        )

        const newEntry: HistoryEntry = { type: 'question', question, answer }
        const newHistory: HistoryEntry[] = [...session.history, newEntry]
        const outOfQuestions = newHistory.length >= MAX_QUESTIONS

        await saveSession(sessionId, { ...session, history: newHistory })

        return NextResponse.json({
          answer,
          questionsUsed: newHistory.length,
          questionsRemaining: MAX_QUESTIONS - newHistory.length,
          ...(outOfQuestions && { finalGuess: true as const }),
        })
      } catch (err) {
        console.error('[POST /api/ask]', err)
        return NextResponse.json(
          { error: { code: 'INTERNAL', message: 'Failed to get answer. Try again.' } },
          { status: 500 },
        )
      }
    },
  })
}
