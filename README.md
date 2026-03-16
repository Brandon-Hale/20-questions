# 20 Questions

AI-powered 20 Questions. Built with Next.js 15, Tailwind CSS v4, TypeScript, and Upstash Redis.

## Stack

- **Next.js 15** (App Router) — frontend + API routes in one project
- **TypeScript** — strict mode throughout, shared types across server and client
- **Tailwind CSS v4** — utility-first styling
- **Upstash Redis** — rate limiting + server-side session storage
- **Anthropic Claude** — picks the secret, answers questions, judges guesses

## Security model

| Concern | How it's handled |
|---|---|
| API key exposure | Key lives only in server env vars, never sent to the browser |
| Secret answer leaking | Stored in Redis server-side, only revealed to client when game ends |
| Abuse / cost blowout | 3 games per IP per day · 70 API calls per IP per day |
| Session tampering | Sessions stored in Redis with a 2h TTL — client only holds an opaque UUID |

## Local setup

```bash
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

npm install
npm run dev
# → http://localhost:3000
```

## Get Upstash Redis (free)

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create Database → free tier is fine
3. Copy **REST URL** and **REST Token** into `.env.local`

## Deploy

This is a standard Next.js app. It runs anywhere Node.js runs.

### Vercel (easiest)
```bash
npx vercel
```
Add the three env vars in the Vercel dashboard and redeploy.

### Railway / Render / Fly.io
Push to GitHub, connect the repo, add the three env vars, deploy.

### Self-hosted VPS
```bash
npm run build
npm start          # runs on port 3000 by default
```
Put Nginx or Caddy in front as a reverse proxy.

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── start/route.ts   POST — pick secret, create session
│   │   ├── ask/route.ts     POST — answer a yes/no question
│   │   └── guess/route.ts   POST — judge a guess
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Game.tsx             Root client component
│   ├── StartScreen.tsx
│   ├── GameScreen.tsx
│   └── ResultScreen.tsx
├── hooks/
│   └── useGame.ts           All game state
└── lib/
    ├── api.ts               Typed fetch wrappers (client)
    ├── claude.ts            Anthropic calls (server only)
    ├── redis.ts             Upstash client + rate limiters (server only)
    └── types.ts             Shared types
```

## Tuning rate limits

Edit `src/lib/redis.ts`:

```ts
// Games per IP per day
export const gameRatelimit = new Ratelimit({
  limiter: Ratelimit.fixedWindow(3, '24 h'),  // ← change 3
})

// Total API calls per IP per day
export const callRatelimit = new Ratelimit({
  limiter: Ratelimit.fixedWindow(70, '24 h'), // ← change 70
})
```
