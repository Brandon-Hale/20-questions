import { NextResponse } from 'next/server'
import { getSession, getGameRatelimit, getClientIp } from '@/lib/redis'
import type { ResumeResponse, ApiError } from '@/lib/types'

const MAX_QUESTIONS = 20
const MAX_HINTS = 3

interface ResumeBody {
  sessionId?: unknown
}

export async function POST(req: Request): Promise<NextResponse<ResumeResponse | ApiError>> {
  const body = (await req.json().catch(() => ({}))) as ResumeBody
  const { sessionId } = body

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing sessionId' } },
      { status: 400 },
    )
  }

  const session = await getSession(sessionId)
  if (!session || session.gameOver) {
    return NextResponse.json(
      { error: { code: 'SESSION_NOT_FOUND', message: 'Session expired or already finished.' } },
      { status: 404 },
    )
  }

  const ip = getClientIp(req.headers)
  const gameRemaining = await getGameRatelimit().getRemaining(ip)
  const hintsUsed = session.history.filter((h) => h.type === 'hint').length

  return NextResponse.json({
    sessionId,
    category: session.category,
    article: session.article,
    history: session.history,
    gamesRemaining: gameRemaining.remaining,
    hintsRemaining: Math.max(0, MAX_HINTS - hintsUsed),
    ...(session.history.length >= MAX_QUESTIONS && { finalGuess: true as const }),
  })
}
