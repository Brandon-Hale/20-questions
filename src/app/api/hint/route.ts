import { NextResponse } from 'next/server'
import { getCallRatelimit, getSession, saveSession, getClientIp } from '@/lib/redis'
import { getHint } from '@/lib/claude'
import type { HintResponse, ApiError, HistoryEntry } from '@/lib/types'

const MAX_QUESTIONS = 20
const MAX_HINTS = 3

interface HintBody {
  sessionId?: unknown
}

export async function POST(req: Request): Promise<NextResponse<HintResponse | ApiError>> {
  const body = (await req.json().catch(() => ({}))) as HintBody
  const { sessionId } = body

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing sessionId' } },
      { status: 400 },
    )
  }

  const ip = getClientIp(req.headers)
  const callCheck = await getCallRatelimit().limit(ip)
  if (!callCheck.success) {
    return NextResponse.json(
      { error: { code: 'CALL_LIMIT', message: 'Daily API limit reached. Come back tomorrow.' } },
      { status: 429 },
    )
  }

  const session = await getSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'SESSION_NOT_FOUND', message: 'Session expired or not found.' } },
      { status: 404 },
    )
  }
  if (session.gameOver) {
    return NextResponse.json(
      { error: { code: 'GAME_OVER', message: 'This game is already over.' } },
      { status: 400 },
    )
  }
  if (session.history.length >= MAX_QUESTIONS) {
    return NextResponse.json(
      { error: { code: 'QUESTION_LIMIT', message: 'No questions remaining.' } },
      { status: 400 },
    )
  }
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
}
