/**
 * lab-toc.tsx — Table of Contents for lab viewer.
 *
 * Desktop (lg+): sticky sidebar, always visible.
 * Mobile (<lg): hidden; open via Sheet trigger button.
 *
 * TOC entries: THINK, SEE, SHIP/Quiz, SHIP/Flashcards, SHIP/Commands.
 * Active section highlighted via IntersectionObserver on section elements.
 */

import { useEffect, useRef, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// ── TOC entries ───────────────────────────────────────────────────────────────

interface TocEntry {
  id: string
  label: string
  phase: 'THINK' | 'SEE' | 'SHIP'
}

export const LAB_TOC_ENTRIES: TocEntry[] = [
  { id: 'section-think',      label: 'TL;DR',       phase: 'THINK' },
  { id: 'section-see',        label: 'Walkthrough',  phase: 'SEE'   },
  { id: 'section-quiz',       label: 'Quiz',         phase: 'SHIP'  },
  { id: 'section-flashcards', label: 'Flashcards',   phase: 'SHIP'  },
  { id: 'section-commands',   label: 'Commands',     phase: 'SHIP'  },
]

const PHASE_DOT: Record<TocEntry['phase'], string> = {
  THINK: 'bg-violet-500',
  SEE:   'bg-blue-500',
  SHIP:  'bg-emerald-500',
}

// ── Hook: active section via IntersectionObserver ─────────────────────────────

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current?.disconnect()

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pick the top-most intersecting entry
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0 && visible[0].target.id) {
          setActive(visible[0].target.id)
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 },
    )

    elements.forEach((el) => observerRef.current!.observe(el))
    return () => observerRef.current?.disconnect()
  }, [ids])

  return active
}

// ── TocList ───────────────────────────────────────────────────────────────────

function TocList({ activeId, onSelect }: { activeId: string; onSelect?: () => void }) {
  return (
    <nav aria-label="Lab sections">
      <ul className="space-y-1">
        {LAB_TOC_ENTRIES.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={onSelect}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors',
                activeId === entry.id
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', PHASE_DOT[entry.phase])} />
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function LabToc() {
  const ids = LAB_TOC_ENTRIES.map((e) => e.id)
  const activeId = useActiveSection(ids)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      {/* Desktop sticky sidebar — hidden on mobile */}
      <aside
        className="hidden lg:block sticky top-20 h-fit w-48 shrink-0 self-start"
        aria-label="Table of contents"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        <TocList activeId={activeId} />
      </aside>

      {/* Mobile TOC trigger — visible only below lg */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="shadow-md gap-2">
              <BookOpen className="h-4 w-4" />
              Contents
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-10">
            <SheetHeader>
              <SheetTitle className="text-sm">Lab Contents</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <TocList activeId={activeId} onSelect={() => setSheetOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
