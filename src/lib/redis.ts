import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import type { GameSession } from './types'

let _redis: Redis | null = null
let _gameRatelimit: Ratelimit | null = null
let _callRatelimit: Ratelimit | null = null

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env['UPSTASH_REDIS_REST_URL']
    const token = process.env['UPSTASH_REDIS_REST_TOKEN']
    if (!url || !token) {
      throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN — add them to .env.local (see .env.example)')
    }
    _redis = new Redis({ url, token })
  }
  return _redis
}

/** 3 new games per IP per 24 hours */
export function getGameRatelimit(): Ratelimit {
  if (!_gameRatelimit) {
    _gameRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(3, '24 h'),
      prefix: 'rl:games',
    })
  }
  return _gameRatelimit
}

/** 70 total API calls per IP per 24 hours — hard ceiling */
export function getCallRatelimit(): Ratelimit {
  if (!_callRatelimit) {
    _callRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(70, '24 h'),
      prefix: 'rl:calls',
    })
  }
  return _callRatelimit
}

/** Persist a session with a 2-hour TTL */
export async function saveSession(id: string, data: GameSession): Promise<void> {
  await getRedis().set(`session:${id}`, JSON.stringify(data), { ex: 7200 })
}

/** Load a session, returns null if missing or expired */
export async function getSession(id: string): Promise<GameSession | null> {
  const raw = await getRedis().get<string>(`session:${id}`)
  if (!raw) return null
  return typeof raw === 'string' ? (JSON.parse(raw) as GameSession) : (raw as GameSession)
}

/** Extract real client IP from Next.js request headers */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}
