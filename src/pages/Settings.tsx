import { useEffect, useState } from 'react'
import { LANGUAGES } from '../types'
import type { SummaryOptions } from '../types'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { defaults, refresh, updateBackendUrl, updateFolders, updateDefaultOptions } = usePipelineDefaults()
  const { user, signOut } = useAuth()
  const [newFolder, setNewFolder] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5') {
        e.preventDefault()
        refresh()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleOptionsChange(o: SummaryOptions) {
    updateDefaultOptions(o)
  }

  function handleFolderRename(index: number, value: string) {
    if (!defaults) return
    const next = [...defaults.folders]
    next[index] = value
    updateFolders(next)
  }

  function handleFolderRemove(index: number) {
    if (!defaults) return
    updateFolders(defaults.folders.filter((_, i) => i !== index))
  }

  function handleFolderAdd() {
    const trimmed = newFolder.trim()
    if (!defaults || !trimmed || defaults.folders.includes(trimmed)) return
    updateFolders([...defaults.folders, trimmed])
    setNewFolder('')
  }

  return (
    <div className="profile-settings-shell">
      <aside className="profile-panel">
        <div className="profile-avatar">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
          </svg>
        </div>
        <h2>Clipbrief Reader</h2>
        <p>{user?.email ?? 'Local preview'}</p>
        <nav>
          <button className="active">Personal information</button>
          <button>Reading preferences</button>
          <button>Categories</button>
          {user && <button onClick={signOut}>Sign out</button>}
        </nav>
      </aside>

      <section className="profile-content">
        <header><span>ACCOUNT</span><h2>Profile Settings</h2></header>
        <section className="profile-form-section">
          <h3>Personal information</h3>
          <div className="profile-fields">
            <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" /></label>
            <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" /></label>
            <label className="full">Email<input value={user?.email ?? 'preview@clipbrief.app'} readOnly /></label>
            <label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 000 000 0000" /></label>
            <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, Country" /></label>
          </div>
        </section>
        {defaults && (
          <>
            <section className="profile-form-section">
              <h3>Reading preferences</h3>
              <div className="profile-toggles">
                <label><input type="checkbox" checked={defaults.defaultOptions.emoji} onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, emoji: e.target.checked })} />Add emojis</label>
                <label><input type="checkbox" checked={defaults.defaultOptions.kidFriendly} onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, kidFriendly: e.target.checked })} />Use simple language</label>
              </div>
              <div className="profile-fields preference-fields">
                <label>Summary language
                  <select value={defaults.defaultOptions.language} onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, language: e.target.value as SummaryOptions['language'] })}>
                    {LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
                  </select>
                </label>
                <label>Backend URL<input value={defaults.backendUrl} onChange={(e) => updateBackendUrl(e.target.value)} placeholder="http://127.0.0.1:3000" /></label>
              </div>
            </section>

            <section className="profile-form-section">
              <h3>Categories</h3>
              <div className="profile-category-list">
                {defaults.folders.map((category, index) => (
                  <div key={index}><input value={category} onChange={(e) => handleFolderRename(index, e.target.value)} /><button onClick={() => handleFolderRemove(index)}>Remove</button></div>
                ))}
                <div><input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="New category" /><button className="add" onClick={handleFolderAdd}>Add</button></div>
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  )
}
