const CLAUDE_BASE = 'https://api.anthropic.com/v1'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OPENAI_BASE = 'https://api.openai.com/v1'
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'

const LANGUAGE_NAMES = { ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Chinese' }

const TIMEOUT_MS = 60_000
const MAX_TOKENS = 1024 * 10
function makeSignal(outerSignal) {
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS)
  return outerSignal ? AbortSignal.any([timeoutSignal, outerSignal]) : timeoutSignal
}

function buildSystemPrompt(options, categories) {
  const styleLines = []
  if (options.kidFriendly) styleLines.push('Summarize using simple words and short sentences a child could understand.')
  if (options.emoji) styleLines.push('Sprinkle in emojis that fit the content throughout the summary.')
  return `You are an AI that classifies and summarizes news articles.
Classify the given article into exactly one of these categories: ${categories.join(', ')}. The category value must exactly match one from this list.
Then summarize the article in ${LANGUAGE_NAMES[options.language]} in exactly 3 lines, each at most 100 characters. Format exactly as "1. ...\\n2. ...\\n3. ..." — a \n only ever separates one numbered item from the next. Never insert a \n inside a single numbered item (e.g. "1. xx\\nxxx\\n2. xxx" is forbidden); each item must stay on one line.
${styleLines.join('\n')}
Output only the JSON format below. No markdown, no explanations.
{ "category": "${categories[0]}", "summary": "..." }`
}

function extractJSON(raw, categories) {
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const fenced = stripped.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const parsed = JSON.parse(fenced)
  if (!categories.includes(parsed.category)) throw new Error(`Unknown category: ${parsed.category}`)
  if (typeof parsed.summary !== 'string' || !parsed.summary) throw new Error('Missing summary')
  return parsed
}

async function callClaude(systemPrompt, article, model, key, signal) {
  const res = await fetch(`${CLAUDE_BASE}/messages`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: systemPrompt, messages: [{ role: 'user', content: article }] }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function callGemini(systemPrompt, article, model, key, signal) {
  const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: article }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: MAX_TOKENS },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}

async function callOpenAI(systemPrompt, article, model, key, signal) {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: article }],
      response_format: { type: 'json_object' },
      max_tokens: MAX_TOKENS,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callNvidia(systemPrompt, article, model, key, signal) {
  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: article }],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(`NVIDIA NIM ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function summarizeArticle(article, options, provider, model, keys, signal, categories) {
  const systemPrompt = buildSystemPrompt(options, categories)
  const key = keys[provider]
  if (!key) throw new Error(`${provider} API key is missing`)

  let raw
  if (provider === 'claude') raw = await callClaude(systemPrompt, article, model, key, signal)
  else if (provider === 'gemini') raw = await callGemini(systemPrompt, article, model, key, signal)
  else if (provider === 'openai') raw = await callOpenAI(systemPrompt, article, model, key, signal)
  else raw = await callNvidia(systemPrompt, article, model, key, signal)

  return extractJSON(raw, categories)
}

function buildChatSystemPrompt(articleText) {
  return `You are a helpful assistant answering questions about the article below. Use it as your primary source of truth. If the question cannot be answered from the article, say so clearly.

Article:
${articleText}`
}

async function consumeSSE(response, onEvent) {
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        onEvent(JSON.parse(payload))
      } catch {
        // ignore malformed/partial SSE payloads
      }
    }
  }
}

async function streamClaudeChat(systemPrompt, history, model, key, onChunk, signal) {
  const res = await fetch(`${CLAUDE_BASE}/messages`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  })
  let full = ''
  await consumeSSE(res, (event) => {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      full += event.delta.text
      onChunk(event.delta.text)
    }
  })
  return full
}

async function streamGeminiChat(systemPrompt, history, model, key, onChunk, signal) {
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(`${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: MAX_TOKENS },
    }),
  })
  let full = ''
  await consumeSSE(res, (event) => {
    const text = event.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) {
      full += text
      onChunk(text)
    }
  })
  return full
}

async function streamOpenAiCompatibleChat(base, systemPrompt, history, model, key, onChunk, signal) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))],
      max_tokens: MAX_TOKENS,
      stream: true,
    }),
  })
  let full = ''
  await consumeSSE(res, (event) => {
    const text = event.choices?.[0]?.delta?.content
    if (text) {
      full += text
      onChunk(text)
    }
  })
  return full
}

async function streamChat(provider, articleText, history, model, keys, onChunk, signal) {
  const key = keys[provider]
  if (!key) throw new Error(`${provider} API key is missing`)
  const systemPrompt = buildChatSystemPrompt(articleText)

  if (provider === 'claude') return streamClaudeChat(systemPrompt, history, model, key, onChunk, signal)
  if (provider === 'gemini') return streamGeminiChat(systemPrompt, history, model, key, onChunk, signal)
  if (provider === 'openai') return streamOpenAiCompatibleChat(OPENAI_BASE, systemPrompt, history, model, key, onChunk, signal)
  return streamOpenAiCompatibleChat(NVIDIA_BASE, systemPrompt, history, model, key, onChunk, signal)
}

module.exports = { summarizeArticle, streamChat }
