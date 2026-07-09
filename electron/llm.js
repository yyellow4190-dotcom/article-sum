const TIMEOUT_MS = 60_000
function makeSignal(outerSignal) {
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS)
  return outerSignal ? AbortSignal.any([timeoutSignal, outerSignal]) : timeoutSignal
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

async function streamChat(backendUrl, articleText, history, onChunk, signal) {
  const res = await fetch(`${backendUrl}/chat`, {
    method: 'POST',
    signal: makeSignal(signal),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articleText,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
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

module.exports = { streamChat }

