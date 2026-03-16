import type { Category, Article, YesNoAnswer, HistoryEntry } from './types'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>
  error?: { message: string }
}

function buildHeaders(): HeadersInit {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY — add it to .env.local (see .env.example)')
  }
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = text.replace(/```json\s*|```\s*/g, '').trim()
  return JSON.parse(cleaned) as T
}

async function callClaude(system: string, userContent: string, maxTokens = 100): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<AnthropicResponse>
    throw new Error(err.error?.message ?? `Anthropic API error ${res.status}`)
  }

  const data = (await res.json()) as AnthropicResponse
  const text = data.content[0]?.text
  if (!text) throw new Error('Empty response from Anthropic')
  return text
}

// ---------------------------------------------------------------------------

interface PickSecretResult {
  answer: string
  category: Category
  article: Article
}

const CATEGORIES: Category[] = ['person', 'place', 'object']

export async function pickSecret(): Promise<PickSecretResult> {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]!

  const text = await callClaude(
    `You are picking a secret for a 20 questions game.
    The category has been chosen for you: ${category}.
    Pick one real, well-known ${category}. Medium difficulty — recognisable but not trivially easy.
    Respond ONLY with valid JSON, no markdown:
    {"answer": "string", "category": "${category}", "article": "a|an"}`,
    `Pick a well-known ${category} for 20 questions.`,
    150,
  )
  const result = parseJsonResponse<PickSecretResult>(text)
  result.category = category
  return result
}

export async function answerQuestion(
  secret: { answer: string; category: Category },
  question: string,
  history: HistoryEntry[],
): Promise<YesNoAnswer> {
  const historyText =
    history.length > 0
      ? history.map((h, i) => `Q${i + 1}: ${h.question} → ${h.answer}`).join('\n')
      : 'None yet.'

  const text = await callClaude(
    `You are playing 20 questions. The secret is "${secret.answer}" (${secret.category}).
Answer the player's yes/no question honestly and accurately. Choose:
"Yes", "No", "Sometimes", or "Sort of".
Respond ONLY with valid JSON, no markdown: {"answer": "Yes"|"No"|"Sometimes"|"Sort of"}`,
    `Previous questions:\n${historyText}\n\nNew question: "${question}"`,
    60,
  )
  const parsed = parseJsonResponse<{ answer: YesNoAnswer }>(text)
  return parsed.answer
}

export async function judgeGuess(secretAnswer: string, guess: string): Promise<boolean> {
  const text = await callClaude(
    `The secret answer is "${secretAnswer}".
Does the player's guess refer to the same thing? Accept alternate spellings, nicknames, and clear descriptions.
Respond ONLY with valid JSON, no markdown: {"correct": true|false}`,
    `Player's guess: "${guess}"`,
    40,
  )
  const parsed = parseJsonResponse<{ correct: boolean }>(text)
  return parsed.correct
}
