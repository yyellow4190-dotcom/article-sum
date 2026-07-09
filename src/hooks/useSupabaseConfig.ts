import { useEffect, useState } from 'react'

interface SupabaseConfig {
  url: string
  anonKey: string
}

export function useSupabaseConfig() {
  const [config, setConfig] = useState<SupabaseConfig | null>(null)

  useEffect(() => {
    window.api?.getSettings().then((s) => setConfig(s.supabase))
  }, [])

  function updateConfig(partial: Partial<SupabaseConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...partial } : prev))
    window.api?.syncSettings({ supabase: { ...config, ...partial } as SupabaseConfig })
  }

  return { config, updateConfig }
}
