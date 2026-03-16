import type { Difficulty, Category, Article, YesNoAnswer, HistoryEntry } from './types'

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

const DIFFICULTY_PROMPTS: Record<Difficulty, string> = {
  easy: 'Very easy — pick something extremely well-known and obvious that most children would recognise (e.g. "dog", "the Sun", "pizza").',
  medium: 'Medium difficulty — recognisable to most adults but not trivially easy (e.g. "Mount Everest", "Albert Einstein", "a violin").',
  hard: 'Hard — pick something that exists and is real but requires specific knowledge to identify (e.g. "a sextant", "Liechtenstein", "Ada Lovelace").',
  extreme: 'Extremely hard — pick something very obscure that only a specialist or trivia expert would know (e.g. "a quasar", "Tuvalu", "Hedy Lamarr").',
}

// Random themes to nudge Claude away from repeating the same picks
const THEMES: Record<Category, string[]> = {
  person: [
    'historical leader', 'scientist', 'musician', 'athlete', 'actor', 'inventor',
    'artist', 'writer', 'explorer', 'philosopher', 'chef', 'activist',
    'comedian', 'astronaut', 'monarch', 'filmmaker', 'architect', 'dancer',
  ],
  place: [
    'natural wonder', 'city', 'island', 'mountain', 'ancient site', 'building',
    'country', 'desert', 'lake', 'national park', 'bridge', 'castle',
    'river', 'volcano', 'cave', 'beach', 'forest', 'canyon',
  ],
  object: [
    'kitchen item', 'musical instrument', 'tool', 'vehicle', 'clothing',
    'toy', 'sport equipment', 'electronic device', 'furniture', 'weapon',
    'food', 'drink', 'animal', 'plant', 'gemstone', 'board game', 'book', 'medicine',
  ],
}

export async function pickSecret(difficulty: Difficulty = 'medium'): Promise<PickSecretResult> {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]!
  const difficultyHint = DIFFICULTY_PROMPTS[difficulty]
  const themes = THEMES[category]
  const theme = themes[Math.floor(Math.random() * themes.length)]!
  const seed = Math.floor(Math.random() * 10000)

  const text = await callClaude(
    `You are picking a secret for a 20 questions game.
    The category has been chosen for you: ${category}.
    ${difficultyHint}
    Theme hint: think about "${theme}" (but you can pick anything in the ${category} category).
    Be creative and surprising - do NOT pick the most obvious or common answer. Avoid clichés.
    Random seed: ${seed}
    Respond ONLY with valid JSON, no markdown:
    {"answer": "string", "category": "${category}", "article": "a|an"}`,
    `Pick a ${difficulty}-difficulty ${category} for 20 questions. Theme: ${theme}. Seed: ${seed}.`,
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
    "Yes", "No", "Sometimes", "Sort of", or "Invalid".
    Use "Invalid" if the input is gibberish, random letters, not a real question, or impossible to answer with yes/no.
    Respond ONLY with valid JSON, no markdown: {"answer": "Yes"|"No"|"Sometimes"|"Sort of"|"Invalid"}`,
    `Previous questions:\n${historyText}\n\nNew question: "${question}"`,
    60,
  )
  const parsed = parseJsonResponse<{ answer: YesNoAnswer }>(text)
  return parsed.answer
}

export async function getHint(
  secret: { answer: string; category: Category },
  history: HistoryEntry[],
): Promise<string> {
  const historyText =
    history.length > 0
      ? history.map((h, i) => `Q${i + 1}: ${h.question} → ${h.answer}`).join('\n')
      : 'None yet.'

  const text = await callClaude(
    `You are playing 20 questions. The secret is "${secret.answer}" (${secret.category}).
    Give the player a short, subtle hint — one sentence max. Don't make it too obvious.
    Look at what they've already asked and give a hint that nudges them in a new direction.
    Respond ONLY with valid JSON, no markdown: {"hint": "string"}`,
    `Previous questions:\n${historyText}\n\nGive a subtle hint.`,
    100,
  )
  const parsed = parseJsonResponse<{ hint: string }>(text)
  return parsed.hint
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
