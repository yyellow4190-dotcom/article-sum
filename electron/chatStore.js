const db = require('./db')

async function getSession(contentId) {
  const { data, error } = await db
    .getClient()
    .from('chat_sessions')
    .select('messages, provider, updated_at')
    .eq('content_id', contentId)
    .maybeSingle()
  if (error) throw error
  return {
    messages: data?.messages ?? [],
    provider: data?.provider ?? null,
    updatedAt: data?.updated_at ?? null,
  }
}

async function listSessions() {
  const { data, error } = await db.getClient().from('chat_sessions').select('content_id, messages, provider, updated_at')
  if (error) throw error
  return data.map((row) => ({
    contentId: row.content_id,
    provider: row.provider,
    updatedAt: row.updated_at,
    lastMessage: row.messages.length ? row.messages[row.messages.length - 1].content : null,
  }))
}

async function appendMessage(contentId, message) {
  const client = db.getClient()
  const { data, error: fetchError } = await client
    .from('chat_sessions')
    .select('messages')
    .eq('content_id', contentId)
    .maybeSingle()
  if (fetchError) throw fetchError

  const messages = [...(data?.messages ?? []), message]
  const { error } = await client
    .from('chat_sessions')
    .upsert({ content_id: contentId, messages, updated_at: message.createdAt }, { onConflict: 'content_id' })
  if (error) throw error
}

async function setProvider(contentId, provider) {
  const { error } = await db
    .getClient()
    .from('chat_sessions')
    .upsert({ content_id: contentId, provider }, { onConflict: 'content_id' })
  if (error) throw error
}

async function deleteSession(contentId) {
  const { error } = await db.getClient().from('chat_sessions').delete().eq('content_id', contentId)
  if (error) throw error
}

module.exports = { getSession, listSessions, appendMessage, setProvider, deleteSession }
