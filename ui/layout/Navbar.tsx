'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, X } from 'lucide-react'
import { FaGithub } from "react-icons/fa";
import { useState } from 'react'
import { ThemeToggle } from '@/ui/theme/ThemeToggle'
import { cn } from '@/core/utils'
import { APP_NAME, GITHUB_URL } from '@/core/constants'

const navItems = [
  { label: 'Agents', href: '/patterns/agents' },
  { label: 'RAG', href: '/patterns/rag' },
  { label: 'Evaluations', href: '/patterns/evaluations' },
  { label: 'Fine-Tuning', href: '/patterns/finetuning' },
  { label: 'Deployment', href: '/patterns/deployment' },
  { label: 'MCP', href: '/patterns/mcp' },
  { label: 'Observability', href: '/patterns/observability' },
]

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        'relative py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]',
        active && 'text-[var(--text-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#00D2FF]',
      )}
    >
      {label}
    </Link>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color:var(--bg-primary)/0.86] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-mono text-sm font-bold tracking-normal text-[var(--text-primary)] sm:text-base">
          {APP_NAME.toUpperCase()}
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 border-2 border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-muted)] shadow-[3px_3px_0_var(--border)] transition-[transform,box-shadow,border-color] duration-100 hover:-translate-y-0.5 hover:border-[#00D2FF] hover:text-[var(--text-primary)]"
            aria-label="Open search"
            data-search-trigger
          >
            <Search className="size-4" />
            <span className="font-mono text-xs">Ctrl + K</span>
          </button>
          <Link
            href={GITHUB_URL}
            aria-label="GitHub repository"
            className="inline-flex size-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[3px_3px_0_var(--border)] transition-[transform,box-shadow,border-color] duration-100 hover:-translate-y-0.5 hover:border-[#00D2FF]"
          >
            <FaGithub className="size-4" />
          </Link>
          <ThemeToggle />
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[3px_3px_0_var(--border)] md:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 md:hidden">
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 border-2 border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm shadow-[3px_3px_0_var(--border)]"
              data-search-trigger
            >
              <Search className="size-4" />
              <span className="font-mono text-xs">⌘K</span>
            </button>
            <Link
              href={GITHUB_URL}
              aria-label="GitHub repository"
              className="inline-flex size-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[3px_3px_0_var(--border)]"
            >
              <FaGithub className="size-4" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </header>
  )
}
