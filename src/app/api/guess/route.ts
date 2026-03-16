import { NextResponse } from 'next/server'
import { getCallRatelimit, getSession, saveSession, getClientIp } from '@/lib/redis'
import { judgeGuess } from '@/lib/claude'
import type { GuessResponse, ApiError, HistoryEntry } from '@/lib/types'

const MAX_QUESTIONS = 20
const MAX_INPUT_LENGTH = 500

interface GuessBody {
  sessionId?: unknown
  guess?: unknown
}

export async function POST(req: Request): Promise<NextResponse<GuessResponse | ApiError>> {
  const body = (await req.json().catch(() => ({}))) as GuessBody
  const { sessionId, guess } = body

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing sessionId' } },
      { status: 400 },
    )
  }
  if (typeof guess !== 'string' || guess.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing guess' } },
      { status: 400 },
    )
  }
  if (guess.trim().length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: `Guess must be under ${MAX_INPUT_LENGTH} characters.` } },
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

  const isFinalGuess = session.history.length >= MAX_QUESTIONS

  try {
    const correct = await judgeGuess(session.answer, guess.trim())

    const newEntry: HistoryEntry = {
      type: 'guess',
      question: guess.trim(),
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
}
