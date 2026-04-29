import { NextResponse } from 'next/server'
import { saveSession } from '@/lib/redis'
import { getHint } from '@/lib/claude'
import { withSession, MAX_QUESTIONS } from '@/lib/withSession'
import type { HintResponse, ApiError, HistoryEntry } from '@/lib/types'

const MAX_HINTS = 3

interface HintBody {
  sessionId?: unknown
}

export async function POST(req: Request): Promise<NextResponse<HintResponse | ApiError>> {
  return withSession<HintBody, HintResponse>(req, {
    handler: async ({ session, sessionId }) => {
      const hintsUsed = session.history.filter((h) => h.type === 'hint').length
      if (hintsUsed >= MAX_HINTS) {
        return NextResponse.json(
          { error: { code: 'HINT_LIMIT', message: `You've used all ${MAX_HINTS} hints this round.` } },
          { status: 400 },
        )
      }

      try {
        const hint = await getHint(
          { answer: session.answer, category: session.category },
          session.history,
        )

        const newEntry: HistoryEntry = { type: 'hint', question: 'Hint', answer: hint }
        const newHistory: HistoryEntry[] = [...session.history, newEntry]
        const outOfQuestions = newHistory.length >= MAX_QUESTIONS

        await saveSession(sessionId, { ...session, history: newHistory })

        return NextResponse.json({
          hint,
          questionsUsed: newHistory.length,
          questionsRemaining: MAX_QUESTIONS - newHistory.length,
          hintsRemaining: MAX_HINTS - (hintsUsed + 1),
          ...(outOfQuestions && { finalGuess: true as const }),
        })
      } catch (err) {
        console.error('[POST /api/hint]', err)
        return NextResponse.json(
          { error: { code: 'INTERNAL', message: 'Failed to get hint. Try again.' } },
          { status: 500 },
        )
      }
    },
  })
}
