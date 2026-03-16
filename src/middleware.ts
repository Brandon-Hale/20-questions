import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Max request body size in bytes (16 KB — more than enough for a question/guess) */
const MAX_BODY_SIZE = 16_384

export function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith('/api/')

  // --- Origin check for API routes (block cross-origin abuse) ---
  if (isApi) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')

    // Allow requests with no origin (server-to-server, curl, etc. — still rate-limited)
    if (origin) {
      const allowed = getAllowedOrigins(host)
      const originHost = new URL(origin).host

      if (!allowed.has(originHost)) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Cross-origin requests are not allowed.' } },
          { status: 403 },
        )
      }
    }

    // Reject oversized payloads early
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' } },
        { status: 413 },
      )
    }

    // Block non-POST methods on API routes
    if (req.method !== 'POST') {
      return NextResponse.json(
        { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is accepted.' } },
        { status: 405 },
      )
    }
  }

  // --- Security headers for all responses ---
  const res = NextResponse.next()

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (isApi) {
    // Prevent caching of API responses
    res.headers.set('Cache-Control', 'no-store')
  }

  return res
}

function getAllowedOrigins(host: string | null): Set<string> {
  const origins = new Set<string>()

  // Always allow same-origin
  if (host) origins.add(host)

  // Allow configured origins
  const envOrigins = process.env['ALLOWED_ORIGINS']
  if (envOrigins) {
    for (const o of envOrigins.split(',')) {
      const trimmed = o.trim()
      if (trimmed) {
        try {
          // Handle both "https://domain.com" and bare "domain.com"
          origins.add(trimmed.includes('://') ? new URL(trimmed).host : trimmed)
        } catch {
          // skip malformed entries
        }
      }
    }
  }

  return origins
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
