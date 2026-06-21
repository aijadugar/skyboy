'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="inline-flex size-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[3px_3px_0_var(--border)] transition-[transform,box-shadow,border-color] duration-100 hover:-translate-y-0.5 hover:border-[#00D2FF] hover:shadow-[4px_5px_0_var(--accent-glow)] active:translate-y-px active:shadow-[1px_1px_0_var(--border)]"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
