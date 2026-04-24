/**
 * MisconceptionsSection — hiển thị "Hiểu lầm thường gặp" ở đầu tab THINK.
 * Layout: card cảnh báo màu amber, mỗi item gồm { wrong ❌, right ✅, why }.
 * `why` render qua dangerouslySetInnerHTML để hỗ trợ inline RFC link —
 * cùng posture bảo mật với walkthrough.why (author-controlled content).
 * Return null khi items empty để không render phần đầu trống.
 */

import type { Misconception } from '@/lib/schema-lab'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
        THINK
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )
}

export function MisconceptionsSection({ items }: { items?: Misconception[] }) {
  if (!items || items.length === 0) return null
  return (
    <section className="space-y-4">
      <SectionHeading title="Hiểu lầm thường gặp" />
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2"
          >
            <p className="text-sm font-semibold text-destructive flex gap-2">
              <span aria-hidden="true">❌</span>
              <span dangerouslySetInnerHTML={{ __html: item.wrong }} />
            </p>
            <p className="text-sm text-foreground flex gap-2">
              <span aria-hidden="true">✅</span>
              <span dangerouslySetInnerHTML={{ __html: item.right }} />
            </p>
            <p
              className="text-sm text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.why }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
