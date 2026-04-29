import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getGameRatelimit, getCallRatelimit, saveSession, getClientIp } from '@/lib/redis'
import { pickSecret } from '@/lib/claude'
import type { Difficulty, StartResponse, ApiError } from '@/lib/types'

const VALID_DIFFICULTIES = new Set<string>(['easy', 'medium', 'hard', 'extreme'])

export async function POST(req: Request): Promise<NextResponse<StartResponse | ApiError>> {
  const body = (await req.json().catch(() => ({}))) as { difficulty?: unknown }
  const difficulty = (
    typeof body.difficulty === 'string' && VALID_DIFFICULTIES.has(body.difficulty)
      ? body.difficulty
      : 'medium'
  ) as Difficulty

  const ip = getClientIp(req.headers)

  // Check (don't consume) the game-quota first so a failed pickSecret
  // doesn't permanently burn one of the player's 3 daily slots.
  const gameRemaining = await getGameRatelimit().getRemaining(ip)
  if (gameRemaining.remaining <= 0) {
    const totalMinutes = Math.ceil((gameRemaining.reset - Date.now()) / 1000 / 60)
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

  let secret
  try {
    secret = await pickSecret(difficulty)
  } catch (err) {
    console.error('[POST /api/start] pickSecret', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to start game. Try again.' } },
      { status: 500 },
    )
  }

  // Only consume the game slot now that we have a secret.
  const gameCheck = await getGameRatelimit().limit(ip)
  if (!gameCheck.success) {
    // Lost the race against another concurrent /start. Tell the user.
    return NextResponse.json(
      { error: { code: 'GAME_LIMIT', message: 'Game limit reached. Try again later.' } },
      { status: 429 },
    )
  }

  try {
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
    console.error('[POST /api/start] saveSession', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to start game. Try again.' } },
      { status: 500 },
    )
  }
}
