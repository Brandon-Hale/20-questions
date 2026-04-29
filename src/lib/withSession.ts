import { NextResponse } from 'next/server'
import { getCallRatelimit, getSession, getClientIp } from './redis'
import type { ApiError, GameSession } from './types'

const MAX_INPUT_LENGTH = 500
const MAX_QUESTIONS = 20

interface SessionRouteContext<TBody> {
  session: GameSession
  sessionId: string
  body: TBody
}

/**
 * Shared boilerplate for /api/{ask,hint,guess}: parse JSON, validate the
 * sessionId, optionally length-check a free-text field, run the global
 * call rate-limit, load the session, and check game-over / question-limit
 * state. The handler runs only when all checks pass.
 */
export async function withSession<TBody, TResponse>(
  req: Request,
  opts: {
    /** Field name on the body to length-check (e.g. 'question', 'guess'). */
    textField?: string
    requireQuestionsRemaining?: boolean
    handler: (ctx: SessionRouteContext<TBody>) => Promise<NextResponse<TResponse | ApiError>>
  },
): Promise<NextResponse<TResponse | ApiError>> {
  const requireQuestionsRemaining = opts.requireQuestionsRemaining ?? true

  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const body = raw as TBody
  const sessionId = raw['sessionId']

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing sessionId' } },
      { status: 400 },
    )
  }

  if (opts.textField) {
    const value = raw[opts.textField]
    if (typeof value !== 'string' || value.trim() === '') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: `Missing ${opts.textField}` } },
        { status: 400 },
      )
    }
    if (value.trim().length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: `${opts.textField[0]?.toUpperCase()}${opts.textField.slice(1)} must be under ${MAX_INPUT_LENGTH} characters.`,
          },
        },
        { status: 400 },
      )
    }
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
  if (requireQuestionsRemaining && session.history.length >= MAX_QUESTIONS) {
    return NextResponse.json(
      { error: { code: 'QUESTION_LIMIT', message: 'No questions remaining.' } },
      { status: 400 },
    )
  }

  return opts.handler({ session, sessionId, body })
}

export { MAX_QUESTIONS, MAX_INPUT_LENGTH }
