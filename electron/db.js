const { createClient } = require('@supabase/supabase-js')
const settingsStore = require('./settingsStore')
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./config')

let client = null

// Main process has no localStorage, so the auth session (refresh token) is
// persisted through settingsStore instead — same plaintext handling as the anon key.
const authStorageAdapter = {
  getItem: (key) => settingsStore.getSettings().authStorage?.[key] ?? null,
  setItem: (key, value) => {
    const { authStorage } = settingsStore.getSettings()
    settingsStore.updateSettings({ authStorage: { ...authStorage, [key]: value } })
  },
  removeItem: (key) => {
    const { authStorage } = settingsStore.getSettings()
    const next = { ...authStorage }
    delete next[key]
    settingsStore.updateSettings({ authStorage: next })
  },
}

function getClient() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: authStorageAdapter, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  }
  return client
}

function rowToUser(user) {
  return user ? { id: user.id, email: user.email ?? null } : null
}

async function signUp(email, password) {
  const { data, error } = await getClient().auth.signUp({ email, password })
  if (error) throw error
  return rowToUser(data.user)
}

async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  return rowToUser(data.user)
}

async function signOut() {
  const { error } = await getClient().auth.signOut()
  if (error) throw error
}

async function getUser() {
  const { data, error } = await getClient().auth.getSession()
  if (error) throw error
  return rowToUser(data.session?.user ?? null)
}

function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = getClient().auth.onAuthStateChange((_event, session) => callback(rowToUser(session?.user ?? null)))
  return () => subscription.unsubscribe()
}

function rowToRecord(row) {
  return {
    id: row.id,
    url: row.url,
    tag: row.tag,
    status: row.status,
    data: row.data,
    createdAt: row.created_at,
  }
}

async function insertContent({ url, tag, data }) {
  const { data: row, error } = await getClient()
    .from('contents')
    .insert({ url, tag, status: 'pending', data: data ?? {}, created_at: new Date().toISOString() })
    .select('id')
    .single()
  if (error) throw error
  return row.id
}

async function updateContent(id, { tag, data, embedding }) {
  const patch = {}
  if (tag !== undefined) patch.tag = tag
  if (data !== undefined) patch.data = data
  if (embedding !== undefined) patch.embedding = embedding
  if (Object.keys(patch).length === 0) return
  const { error } = await getClient().from('contents').update(patch).eq('id', id)
  if (error) throw error
}

async function getRelated(id) {
  const { data, error } = await getClient().rpc('match_contents', { source_id: id })
  if (error) throw error
  return data.map(rowToRecord)
}

async function listByStatus(status) {
  const { data, error } = await getClient()
    .from('contents')
    .select('id, url, tag, status, data, created_at')
    .eq('status', status)
    .order('id', { ascending: status === 'pending' })
  if (error) throw error
  return data.map(rowToRecord)
}

async function getContent(id) {
  const { data, error } = await getClient()
    .from('contents')
    .select('id, url, tag, status, data, created_at')
    .eq('id', id)
    .single()
  if (error) throw error
  return rowToRecord(data)
}

async function approve(id, folder) {
  const c = getClient()
  const { data: row, error: fetchError } = await c.from('contents').select('data').eq('id', id).single()
  if (fetchError) throw fetchError
  const data = { ...row.data, folder: folder ?? null }
  const { error } = await c.from('contents').update({ status: 'approved', data }).eq('id', id)
  if (error) throw error
}

async function discard(id) {
  const { error } = await getClient().from('contents').delete().eq('id', id)
  if (error) throw error
}

// 앱 시작 시 활성 job 이 없으므로, processing 상태로 남은 행은 이전 세션이
// 중간에 끊긴 고아 행이다. 실패로 표시해 UI 에서 Discard 할 수 있게 한다.
async function resetStuckJobs() {
  const c = getClient()
  const { data: rows, error } = await c.from('contents').select('id, data').eq('status', 'pending')
  if (error) throw error
  for (const row of rows) {
    if (!row.data.processing) continue
    const data = { ...row.data, processing: false }
    delete data.stage
    data.error = data.error ?? 'Interrupted — the app was restarted while processing.'
    const { error: updateError } = await c.from('contents').update({ data }).eq('id', row.id)
    if (updateError) throw updateError
  }
}

module.exports = {
  getClient,
  insertContent,
  updateContent,
  getContent,
  getRelated,
  listByStatus,
  approve,
  discard,
  resetStuckJobs,
  signUp,
  signIn,
  signOut,
  getUser,
  onAuthStateChange,
}
