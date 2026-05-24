/**
 * ScreenshotFigure — reference screenshot embed cho TryAtHome step.
 *
 * Lazy-load `<img>` để tiết kiệm bandwidth khi optional accordion chưa expand.
 * Caption sanitize HTML bằng DOMPurify (allow `<a>`, `<code>`, `<b>` cơ bản).
 *
 * Usage:
 *   <ScreenshotFigure
 *     src="/labs/dhcp/screenshots/core/phase1-01-vmnet-editor.png"
 *     alt="VMware Workstation Network Editor — VMnet1 tắt DHCP"
 *     caption="Bỏ tick <code>Use local DHCP service</code> trên VMnet1"
 *   />
 */

import DOMPurify from 'dompurify'

interface ScreenshotFigureProps {
  src: string
  alt: string
  caption: string
}

export function ScreenshotFigure({ src, alt, caption }: ScreenshotFigureProps) {
  const sanitizedCaption = DOMPurify.sanitize(caption, {
    ALLOWED_TAGS: ['a', 'code', 'b', 'strong', 'em', 'i', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

  return (
    <figure className="my-2 rounded-md border border-border overflow-hidden bg-card">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="block w-full h-auto bg-muted"
      />
      <figcaption
        className="text-xs text-muted-foreground px-3 py-2 border-t border-border bg-muted/40 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizedCaption }}
      />
    </figure>
  )
}
