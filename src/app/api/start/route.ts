import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getGameRatelimit, getCallRatelimit, saveSession, getClientIp } from '@/lib/redis'
import { pickSecret } from '@/lib/claude'
import type { StartResponse, ApiError } from '@/lib/types'

export async function POST(req: Request): Promise<NextResponse<StartResponse | ApiError>> {
  const ip = getClientIp(req.headers)

  const gameCheck = await getGameRatelimit().limit(ip)
  if (!gameCheck.success) {
    const totalMinutes = Math.ceil((gameCheck.reset - Date.now()) / 1000 / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const resetText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    return NextResponse.json(
      { error: { code: 'GAME_LIMIT', message: `You've played 3 games today. Resets in ~${resetText}.` } },
      { status: 429 },
    )
  }

  const callCheck = await getCallRatelimit().limit(ip)
  if (!callCheck.success) {
    return NextResponse.json(
      { error: { code: 'CALL_LIMIT', message: 'Daily API limit reached. Come back tomorrow.' } },
      { status: 429 },
    )
  }

  try {
    const secret = await pickSecret()
    const sessionId = randomUUID()

    await saveSession(sessionId, {
      answer: secret.answer,
      category: secret.category,
      article: secret.article,
      history: [],
      gameOver: false,
      won: false,
    })

    return NextResponse.json({
      sessionId,
      category: secret.category,
      article: secret.article,
      gamesRemaining: gameCheck.remaining,
    })
  } catch (err) {
    console.error('[POST /api/start]', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to start game. Try again.' } },
      { status: 500 },
    )
  }
}
