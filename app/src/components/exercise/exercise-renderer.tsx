/**
 * exercise-renderer.tsx — render một bài tập: Đề bài → Hướng dẫn thực hiện → Demo thực tế.
 * Tối giản, KHÔNG dùng lab-renderer (không THINK/SEE/TRY). HTML fields render qua
 * dangerouslySetInnerHTML (giống lab content). Code/output render trong <pre>.
 */

import { Clock, Tag, ListChecks, Terminal, BookOpen, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ExerciseContent } from '@/lib/api'

const htmlProps = {
  className:
    '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold leading-relaxed',
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
      {children}
    </pre>
  )
}

export function ExerciseRenderer({ exercise }: { exercise: ExerciseContent }) {
  return (
    <article className="flex-1 min-w-0 space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">{exercise.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {exercise.topic && (
            <span className="flex items-center gap-1 capitalize">
              <Tag className="h-3 w-3" aria-hidden="true" />
              {exercise.topic}
            </span>
          )}
          {exercise.estimated_minutes != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {exercise.estimated_minutes}m
            </span>
          )}
          {exercise.source && <span>Nguồn: {exercise.source}</span>}
          {exercise.tags?.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px] h-4 px-1.5">
              {t}
            </Badge>
          ))}
        </div>
      </header>

      {/* Đề bài */}
      {exercise.brief && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" /> Đề bài
          </h2>
          <div {...htmlProps} dangerouslySetInnerHTML={{ __html: exercise.brief }} />
        </section>
      )}

      {/* Hướng dẫn thực hiện */}
      {exercise.guide?.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" /> Hướng dẫn thực hiện
          </h2>
          <ol className="space-y-4">
            {exercise.guide.map((g) => (
              <li key={g.step} className="rounded-lg border border-border bg-card p-4">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {g.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div {...htmlProps} dangerouslySetInnerHTML={{ __html: g.instruction }} />
                    {g.command && <CodeBlock>{g.command}</CodeBlock>}
                    {g.note && (
                      <p
                        className="mt-2 text-xs text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono"
                        dangerouslySetInnerHTML={{ __html: g.note }}
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Demo thực tế */}
      {exercise.demo?.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Terminal className="h-5 w-5 text-primary" aria-hidden="true" /> Demo thực tế
          </h2>
          <ol className="space-y-4">
            {exercise.demo.map((d) => (
              <li key={d.step} className="rounded-lg border border-border bg-card p-4">
                <div {...htmlProps} dangerouslySetInnerHTML={{ __html: d.what }} />
                {d.command && <CodeBlock>{d.command}</CodeBlock>}
                {d.output && (
                  <div className="mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Output</span>
                    <div
                      {...htmlProps}
                      className={`${htmlProps.className} mt-1 rounded-lg bg-muted/40 p-3 text-sm`}
                      dangerouslySetInnerHTML={{ __html: d.output }}
                    />
                  </div>
                )}
                {d.note && (
                  <p
                    className="mt-2 text-xs text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono"
                    dangerouslySetInnerHTML={{ __html: d.note }}
                  />
                )}
                {d.screenshot && (
                  <figure className="mt-2">
                    <img src={d.screenshot.src} alt={d.screenshot.alt} className="rounded-lg border border-border" />
                    <figcaption
                      className="mt-1 text-xs text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: d.screenshot.caption }}
                    />
                  </figure>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* References */}
      {exercise.references?.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold">Tham khảo</h2>
          <ul className="space-y-1 text-sm">
            {exercise.references.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline"
                >
                  {r.label}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
