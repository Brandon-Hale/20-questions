import { NextResponse } from 'next/server'
import { getCallRatelimit, getSession, saveSession, getClientIp } from '@/lib/redis'
import { answerQuestion } from '@/lib/claude'
import type { AskResponse, ApiError, HistoryEntry } from '@/lib/types'

const MAX_QUESTIONS = 20
const MAX_INPUT_LENGTH = 500

interface AskBody {
  sessionId?: unknown
  question?: unknown
}

export async function POST(req: Request): Promise<NextResponse<AskResponse | ApiError>> {
  const body = (await req.json().catch(() => ({}))) as AskBody
  const { sessionId, question } = body

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing sessionId' } },
      { status: 400 },
    )
  }
  if (typeof question !== 'string' || question.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing question' } },
      { status: 400 },
    )
  }
  if (question.trim().length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: `Question must be under ${MAX_INPUT_LENGTH} characters.` } },
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

  try {
    const answer = await answerQuestion(
      { answer: session.answer, category: session.category },
      question.trim(),
      session.history,
    )

    const newEntry: HistoryEntry = { type: 'question', question: question.trim(), answer }
    const newHistory: HistoryEntry[] = [...session.history, newEntry]
    const outOfQuestions = newHistory.length >= MAX_QUESTIONS

    await saveSession(sessionId, { ...session, history: newHistory, gameOver: outOfQuestions })

    return NextResponse.json({
      answer,
      questionsUsed: newHistory.length,
      questionsRemaining: MAX_QUESTIONS - newHistory.length,
      ...(outOfQuestions && { gameOver: true as const, secretAnswer: session.answer }),
    })
  } catch (err) {
    console.error('[POST /api/ask]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to get answer. Try again.' } },
      { status: 500 },
    )
  }
}
